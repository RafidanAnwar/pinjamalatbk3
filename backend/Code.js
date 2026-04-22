const SPREADSHEET_ID = '1yM8sO85eecRs2zoc25bRvlVUYgh_1VhFXV9t-9bGdyw'; // Ganti dengan ID Spreadsheet Anda
const DRIVE_FOLDER_ID = '1HdIgLgR8zpM9I0EequjoK4obNIpi68UT'; // Ganti dengan ID Folder Drive untuk simpan file

// 1. doGet untuk menyajikan UI React (sebagai single file HTML)
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Manajemen Peminjaman Alat K3')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// 1.5. doPost sebagai API Router untuk akses via HTTP (Vercel deployment)
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    var params = body.params || [];

    // Daftar fungsi yang diizinkan dipanggil via HTTP
    var allowedFunctions = {
      'authenticatePetugas': authenticatePetugas,
      'submitPeminjaman': submitPeminjaman,
      'submitPeminjamanLengkap': submitPeminjamanLengkap,
      'uploadFileToDrive': uploadFileToDrive,
      'getKatalogAlat': getKatalogAlat,
      'getPeminjamanList': getPeminjamanList,
      'getLaporanPeminjamanDetailed': getLaporanPeminjamanDetailed,
      'addAlat': addAlat,
      'editAlat': editAlat
    };

    if (!allowedFunctions[action]) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Fungsi "' + action + '" tidak ditemukan atau tidak diizinkan.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var result = allowedFunctions[action].apply(null, params);

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// 2. Fungsi Backend untuk Upload File ke Drive
function uploadFileToDrive(base64Data, fileName, mimeType) {
  try {
    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);

    // Ekstrak base64 murni jika ada prefix seperti "data:image/png;base64,"
    const data = base64Data.split(',').pop();

    const blob = Utilities.newBlob(Utilities.base64Decode(data), mimeType, fileName);
    const file = folder.createFile(blob);

    return {
      success: true,
      drive_file_id: file.getId(),
      url: file.getUrl()
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// 3. Menyimpan Data Peminjaman Lengkap ke Google Sheets (Transaksi & Detail)
function submitPeminjaman(dataPeminjaman, dataDetailPinjam) {
  // dataPeminjaman: { nama_peminjam, email, lokasi, tgl_pinjam, tgl_kembali, drive_file_id_surat }
  // dataDetailPinjam: [{ kode_alat, jumlah }, ...]

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // Menggunakan LockService untuk mencegah race condition (misal 2 orang meminjam bersamaan)
    const lock = LockService.getScriptLock();
    lock.waitLock(10000); // Tunggu hingga 10 detik jika ada proses lain

    try {
      // Generate ID Transaksi (misal: TRX-A8B9C2D)
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let randomPart = '';
      for (let k = 0; k < 8; k++) randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
      const idTransaksi = 'TRX-' + randomPart;

      const sheetTransaksi = ss.getSheetByName('TransaksiPeminjaman');
      if (!sheetTransaksi) throw new Error("Sheet TransaksiPeminjaman tidak ditemukan.");

      // 3a. Insert ke sheet TransaksiPeminjaman
      sheetTransaksi.appendRow([
        idTransaksi,
        dataPeminjaman.nama_peminjam,
        dataPeminjaman.email,
        dataPeminjaman.lokasi,
        dataPeminjaman.tgl_pinjam,
        dataPeminjaman.tgl_kembali,
        dataPeminjaman.drive_file_id_surat,
        dataPeminjaman.jenis_pengujian,
        dataPeminjaman.nomor_surat
      ]);

      const sheetDetail = ss.getSheetByName('DetailPinjam');
      if (!sheetDetail) throw new Error("Sheet DetailPinjam tidak ditemukan.");

      const sheetKatalog = ss.getSheetByName('KatalogAlat');
      if (!sheetKatalog) throw new Error("Sheet KatalogAlat tidak ditemukan.");
      const dataKatalog = sheetKatalog.getDataRange().getValues();

      const detailsToInsert = [];
      const stockUpdates = [];

      // 3b. Validasi ketersediaan sebelum insert detail
      for (let i = 0; i < dataDetailPinjam.length; i++) {
        const item = dataDetailPinjam[i];
        detailsToInsert.push([
          idTransaksi,
          item.kode_alat,
          item.jumlah || 1
        ]);

        let alatDitemukan = false;
        // Struktur KatalogAlat: [kode_alat, nama_alat, kondisi, ketersediaan]
        for (let j = 1; j < dataKatalog.length; j++) { // Mulai dari baris ke-2 (index 1) abaikan header
          if (dataKatalog[j][0] == item.kode_alat) {
            alatDitemukan = true;
            const ketersediaanSaatIni = dataKatalog[j][3]; // index 3 -> kolom D (ketersediaan)

            if (ketersediaanSaatIni !== 'Ready') {
              throw new Error(`Alat dengan Kode: ${item.kode_alat} sedang tidak Ready (Status: ${ketersediaanSaatIni})`);
            }

            // Simpan baris (1-based index) dan status baru untuk di-update nanti
            stockUpdates.push({
              row: j + 1,
              col: 4, // Kolom D (ketersediaan)
              newStatus: 'Dipinjam'
            });
            break;
          }
        }

        if (!alatDitemukan) {
          throw new Error(`Alat dengan Kode ${item.kode_alat} tidak ditemukan dalam katalog.`);
        }
      }

      // 3c. Insert DetailPinjam
      for (let i = 0; i < detailsToInsert.length; i++) {
        sheetDetail.appendRow(detailsToInsert[i]);
      }

      // 3d. Update status di KatalogAlat
      for (let i = 0; i < stockUpdates.length; i++) {
        sheetKatalog.getRange(stockUpdates[i].row, stockUpdates[i].col).setValue(stockUpdates[i].newStatus);
      }

      return { success: true, id_transaksi: idTransaksi, message: 'Data Peminjaman berhasil disimpan' };

    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// 3.5. Menggabungkan Upload Drive dan Submit Peminjaman ke dalam 1 Request
function submitPeminjamanLengkap(dataPeminjaman, dataDetailPinjam, fileInfo) {
  try {
    // 1. Upload File Dulu
    var uploadRes = uploadFileToDrive(fileInfo.base64Data, fileInfo.fileName, fileInfo.mimeType);
    if (!uploadRes.success) {
      throw new Error("Gagal upload surat: " + uploadRes.error);
    }

    // 2. Tambahkan ID File Drive ke Data Peminjaman
    dataPeminjaman.drive_file_id_surat = uploadRes.drive_file_id;
    
    // 3. Lanjutkan Submit ke Sheets
    return submitPeminjaman(dataPeminjaman, dataDetailPinjam);
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// 4. Autentikasi Petugas (Login)
function authenticatePetugas(username, password) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetUsers = ss.getSheetByName('Users');
    if (!sheetUsers) throw new Error("Sheet Users tidak ditemukan.");

    // Data Users: [id, username, password_hash, nama_petugas]
    const usersData = sheetUsers.getDataRange().getValues();

    // Hash password input menggunakan SHA-256 (jika Anda tidak menggunakan hash bcrypt khusus di frontend)
    // Jika frontend mengirim password raw:
    const passwordHash = bytesToHex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password));

    for (let i = 1; i < usersData.length; i++) {
      const dbUsername = usersData[i][1];
      const dbPasswordHash = usersData[i][2]; // Disarankan isi DB adalah hash dari SHA-256
      const dbNamaPetugas = usersData[i][3];

      if (username === dbUsername) {
        // Cek kecocokan hash 
        // Jika frontend sudah melakukan hash, bisa disesuaikan komparasinya di sini
        if (passwordHash === dbPasswordHash || password === dbPasswordHash) {
          // Generate simple token/session identifier
          const sessionToken = Utilities.getUuid();

          return {
            success: true,
            user: {
              username: dbUsername,
              nama_petugas: dbNamaPetugas
            },
            token: sessionToken,
            message: "Login berhasil"
          };
        } else {
          return { success: false, error: "Password salah!" };
        }
      }
    }

    return { success: false, error: "Username tidak ditemukan." };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// Helper: Convert byte array to hexadecimal string untuk Hash Password (SHA-256)
function bytesToHex(bytes) {
  let hexString = '';
  for (let i = 0; i < bytes.length; i++) {
    let byteStr = (bytes[i] & 0xFF).toString(16);
    if (byteStr.length == 1) byteStr = '0' + byteStr;
    hexString += byteStr;
  }
  return hexString;
}

// 5. Mengambil Data Katalog Alat
function getKatalogAlat() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetKatalog = ss.getSheetByName('KatalogAlat');
    if (!sheetKatalog) throw new Error("Sheet KatalogAlat tidak ditemukan.");

    const data = sheetKatalog.getDataRange().getValues();
    const result = [];

    // Baris 1 adalah header, mulai dari baris 2 (index 1)
    // Struktur: [kode_alat, nama_alat, kondisi, ketersediaan]
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0]) {
        result.push({
          kode_alat: row[0] ? row[0].toString() : '',
          nama: row[1] ? row[1].toString() : '',
          kondisi: row[2] ? row[2].toString() : 'Baik',
          ketersediaan: row[3] ? row[3].toString() : 'Ready'
        });
      }
    }

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// 6. Mengambil Data Peminjaman Lengkap
function getPeminjamanList() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetTransaksi = ss.getSheetByName('TransaksiPeminjaman');
    if (!sheetTransaksi) throw new Error("Sheet TransaksiPeminjaman tidak ditemukan.");

    const data = sheetTransaksi.getDataRange().getValues();
    const result = [];

    // Baris 1 adalah header: [id_transaksi, nama_peminjam, email, lokasi, tgl_pinjam, tgl_kembali, drive_file_id_surat]
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0]) {
        result.push({
          id_transaksi: row[0].toString(),
          nama_peminjam: row[1] ? row[1].toString() : '',
          email: row[2] ? row[2].toString() : '',
          lokasi: row[3] ? row[3].toString() : '',
          tgl_pinjam: row[4] ? row[4].toString() : '',
          tgl_kembali: row[5] ? row[5].toString() : '',
          drive_file_id_surat: row[6] ? row[6].toString() : '',
          jenis_pengujian: row[7] ? row[7].toString() : '',
          nomor_surat: row[8] ? row[8].toString() : ''
        });
      }
    }

    return { success: true, data: result.reverse() }; // Urutkan terbaru di atas
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// 6.5. Mengambil Data Laporan Peminjaman Detail (Joined Data)
function getLaporanPeminjamanDetailed() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // Ambil Data Transaksi
    const sheetTransaksi = ss.getSheetByName('TransaksiPeminjaman');
    if (!sheetTransaksi) throw new Error("Sheet TransaksiPeminjaman tidak ditemukan.");
    const dataTransaksi = sheetTransaksi.getDataRange().getValues();
    
    // Ambil Data Detail
    const sheetDetail = ss.getSheetByName('DetailPinjam');
    if (!sheetDetail) throw new Error("Sheet DetailPinjam tidak ditemukan.");
    const dataDetail = sheetDetail.getDataRange().getValues();
    
    // Ambil Data Katalog
    const sheetKatalog = ss.getSheetByName('KatalogAlat');
    if (!sheetKatalog) throw new Error("Sheet KatalogAlat tidak ditemukan.");
    const dataKatalog = sheetKatalog.getDataRange().getValues();
    
    // Map Katalog
    const katalogMap = {};
    for (let i = 1; i < dataKatalog.length; i++) {
        katalogMap[dataKatalog[i][0]] = {
            nama: dataKatalog[i][1],
            kondisi: dataKatalog[i][2],
            ketersediaan: dataKatalog[i][3]
        };
    }

    // Map Transaksi (id_transaksi -> { tanggalPinjam, jenisPengujian })
    const transaksiMap = {};
    for (let i = 1; i < dataTransaksi.length; i++) {
        transaksiMap[dataTransaksi[i][0]] = {
            tgl_pinjam: dataTransaksi[i][4] ? new Date(dataTransaksi[i][4]).toISOString().split('T')[0] : '', // tgl_pinjam
            jenis_pengujian: dataTransaksi[i][7] ? dataTransaksi[i][7].toString() : 'Pengujian Umum', // jenis_pengujian 
        };
    }

    const result = [];
    // Join Data dari Detail Pinjam (Baris 1 adalah Header)
    for (let i = 1; i < dataDetail.length; i++) {
       const row = dataDetail[i];
       const id_transaksi = row[0];
       const kode_alat = row[1];
       const jumlah = row[2] || 1;
       
       const trxData = transaksiMap[id_transaksi];
       const alat = katalogMap[kode_alat];
       
       if (trxData && alat) {
         let mappedKondisi = 'Baik';
         if (alat.kondisi === 'Rusak') mappedKondisi = 'Rusak';
         else if (alat.kondisi === 'Hilang') mappedKondisi = 'Hilang';
         else if (alat.kondisi === 'Diperbaiki') mappedKondisi = 'Diperbaiki';

         result.push({
           id: id_transaksi + '-' + kode_alat, // Unique ID per item pinjaman
           id_transaksi: id_transaksi, // The parent transaction ID
           tanggalPinjam: trxData.tgl_pinjam,
           jenisPengujian: trxData.jenis_pengujian,
           namaAlat: alat.nama || 'Alat Tidak Dikenal',
           jumlahPinjam: jumlah,
           status: alat.ketersediaan === 'Dipinjam' ? 'Dipinjam' : 'Selesai',
           kondisiKembali: mappedKondisi
         });
       }
    }

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// 7. Tambah Alat Baru ke Katalog
function addAlat(dataAlat) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetKatalog = ss.getSheetByName('KatalogAlat');
    if (!sheetKatalog) throw new Error("Sheet KatalogAlat tidak ditemukan.");

    // Cek duplikasi kode_alat
    const data = sheetKatalog.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == dataAlat.kode_alat) {
        throw new Error('Kode alat "' + dataAlat.kode_alat + '" sudah ada dalam katalog.');
      }
    }

    sheetKatalog.appendRow([
      dataAlat.kode_alat,
      dataAlat.nama,
      dataAlat.kondisi || 'Baik',
      dataAlat.ketersediaan || 'Ready'
    ]);

    return { success: true, message: 'Alat berhasil ditambahkan', kode_alat: dataAlat.kode_alat };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// 8. Edit Data Alat di Katalog
function editAlat(dataAlat) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetKatalog = ss.getSheetByName('KatalogAlat');
    if (!sheetKatalog) throw new Error("Sheet KatalogAlat tidak ditemukan.");

    const data = sheetKatalog.getDataRange().getValues();
    let rowIndexToUpdate = -1;

    // Cari baris berdasarkan kode_alat
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === dataAlat.kode_alat) {
        rowIndexToUpdate = i + 1; // 1-based index untuk getRange
        break;
      }
    }

    if (rowIndexToUpdate === -1) {
      throw new Error("Alat dengan kode tersebut tidak ditemukan.");
    }

    // Update cell: getRange(row, col).setValue(val)
    sheetKatalog.getRange(rowIndexToUpdate, 1).setValue(dataAlat.kode_alat);
    sheetKatalog.getRange(rowIndexToUpdate, 2).setValue(dataAlat.nama);
    sheetKatalog.getRange(rowIndexToUpdate, 3).setValue(dataAlat.kondisi);
    sheetKatalog.getRange(rowIndexToUpdate, 4).setValue(dataAlat.ketersediaan);

    return { success: true, message: 'Data alat berhasil diubah' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// 9. Inisialisasi Data Katalog Alat (Jalankan sekali untuk seed data)
function initializeKatalogAlat() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheetKatalog = ss.getSheetByName('KatalogAlat');
    
    if (!sheetKatalog) {
      sheetKatalog = ss.insertSheet('KatalogAlat');
    }

    // Hapus data lama
    sheetKatalog.clearContents();

    // Header: [kode_alat, nama_alat, kondisi, ketersediaan]
    sheetKatalog.appendRow(['kode_alat', 'nama_alat', 'kondisi', 'ketersediaan']);

    // Daftar semua alat dengan status default 'Baik' dan 'Ready'
    const daftarAlat = [
      ['HSM 01', 'Heat Stress Monitor'],
      ['HSM 02', 'Heat Stress Monitor'],
      ['HSM 03', 'Heat Stress Monitor'],
      ['HSM 04', 'Heat Stress Monitor'],
      ['HSM 05', 'Heat Stress Monitor'],
      ['HSM 06', 'Heat Stress Monitor'],
      ['HSM 07', 'Heat Stress Monitor'],
      ['HSM 08', 'Heat Stress Monitor'],
      ['HSM 09', 'Heat Stress Monitor'],
      ['HSM 10', 'Heat Stress Monitor'],
      ['HSM 11', 'Heat Stress Monitor'],
      ['HSM 12', 'Heat Stress Monitor'],
      ['HSM 13', 'Heat Stress Monitor'],
      ['HSM 14', 'Heat Stress Monitor'],
      ['HSM 15', 'Heat Stress Monitor'],
      ['HSM 16', 'Heat Stress Monitor'],
      ['HSM 17', 'Heat Stress Monitor'],
      ['HSM 18', 'Heat Stress Monitor'],
      ['HSM 19', 'Heat Stress Monitor'],
      ['HSM 20', 'Heat Stress Monitor'],
      ['SLM 01', 'Sound Level Meter'],
      ['SLM 02', 'Sound Level Meter'],
      ['SLM 03', 'Sound Level Meter'],
      ['SLM 04', 'Sound Level Meter'],
      ['SLM 05', 'Sound Level Meter'],
      ['SLM 06', 'Sound Level Meter'],
      ['SLM 07', 'Sound Level Meter'],
      ['SLM 08', 'Sound Level Meter'],
      ['SLM 09', 'Sound Level Meter'],
      ['SLM 10', 'Sound Level Meter'],
      ['SLM 11', 'Sound Level Meter'],
      ['SLM 12', 'Sound Level Meter'],
      ['SLM 13', 'Sound Level Meter'],
      ['SLM 14', 'Sound Level Meter'],
      ['SLM 15', 'Sound Level Meter'],
      ['SLM 16', 'Sound Level Meter'],
      ['NDM 01', 'Noise Dosimeter'],
      ['NDM 02', 'Noise Dosimeter'],
      ['NDM 03', 'Noise Dosimeter'],
      ['NDM 04', 'Noise Dosimeter'],
      ['NDM 05', 'Noise Dosimeter'],
      ['NDM 06', 'Noise Dosimeter'],
      ['NDM 07', 'Noise Dosimeter'],
      ['NDM 08', 'Noise Dosimeter'],
      ['NDM 09', 'Noise Dosimeter'],
      ['NDM 10', 'Noise Dosimeter'],
      ['NDM 11', 'Noise Dosimeter'],
      ['NDM 12', 'Noise Dosimeter'],
      ['NDM 13', 'Noise Dosimeter'],
      ['NDM 14', 'Noise Dosimeter'],
      ['NDM 15', 'Noise Dosimeter'],
      ['LUX 01', 'Lux Meter'],
      ['LUX 02', 'Lux Meter'],
      ['LUX 03', 'Lux Meter'],
      ['LUX 04', 'Lux Meter'],
      ['LUX 05', 'Lux Meter'],
      ['LUX 06', 'Lux Meter'],
      ['LUX 07', 'Lux Meter'],
      ['LUX 08', 'Lux Meter'],
      ['LUX 09', 'Lux Meter'],
      ['LUX 10', 'Lux Meter'],
      ['LUX 11', 'Lux Meter'],
      ['LUX 12', 'Lux Meter'],
      ['LUX 13', 'Lux Meter'],
      ['LUX 14', 'Lux Meter'],
      ['LUX 15', 'Lux Meter'],
      ['LUX 16', 'Lux Meter'],
      ['LUX 17', 'Lux Meter'],
      ['TIC 01', 'Thermal Imaging Camera'],
      ['TIC 02', 'Thermal Imaging Camera'],
      ['TIC 03', 'Thermal Imaging Camera'],
      ['TIC 04', 'Thermal Imaging Camera'],
      ['VIT 01', 'Visual IR Thermometer'],
      ['VIT 02', 'Visual IR Thermometer'],
      ['VIT 03', 'Visual IR Thermometer'],
      ['FMR', 'Frequency Meter Range (Stroboscope)'],
      ['EGC 01', 'Earth Ground Clamp'],
      ['EGC 02', 'Earth Ground Clamp'],
      ['EGC 03', 'Earth Ground Clamp'],
      ['EGT 01', 'Earth Ground Tester'],
      ['EGT 02', 'Earth Ground Tester'],
      ['EGT 03', 'Earth Ground Tester'],
      ['EGT 04', 'Earth Ground Tester'],
      ['EGT 05', 'Earth Ground Tester'],
      ['EGT 06', 'Earth Ground Tester'],
      ['EGT 07', 'Earth Ground Tester'],
      ['EGT 08', 'Earth Ground Tester'],
      ['SPI 01', 'Spirometer'],
      ['SPI 02', 'Spirometer'],
      ['SPI 03', 'Spirometer'],
      ['SPI 04', 'Spirometer'],
      ['SPI 05', 'Spirometer'],
      ['SPI 06', 'Spirometer'],
      ['LVAS 01', 'Pump Inhalable and Respirable'],
      ['LVAS 02', 'Pump Inhalable and Respirable'],
      ['LVAS 03', 'Pump Inhalable and Respirable'],
      ['LVAS 04', 'Pump Inhalable and Respirable'],
      ['SKC 02', 'Pompa SKC Gilian 10i'],
      ['SKC 01', 'Pompa SKC Gilian 10i'],
      ['LVAS 07', 'Pump Inhalable and Respirable'],
      ['LVAS 08', 'Pump Inhalable and Respirable'],
      ['LVAS 09', 'Pump Inhalable and Respirable'],
      ['LFS 01', 'Low Flow Sampler'],
      ['LFS 02', 'Low Flow Sampler'],
      ['LFS 03', 'Low Flow Sampler'],
      ['LFS 04', 'Low Flow Sampler'],
      ['LFS 05', 'Low Flow Sampler'],
      ['LFS 06', 'Low Flow Sampler'],
      ['FHK 1', 'Filter Handling Kit'],
      ['FHK 2', 'Filter Handling Kit'],
      ['FHK 3', 'Filter Handling Kit'],
      ['PS 01', 'Particulate Sampler/Analyzer/Counter'],
      ['PS 02', 'Particulate Sampler/Analyzer/Counter'],
      ['PS 03', 'Particulate Sampler/Analyzer/Counter'],
      ['PS 04', 'Particulate Sampler/Analyzer/Counter'],
      ['PS 05', 'Particulate Sampler/Analyzer/Counter'],
      ['DT - 01', 'Dust Track'],
      ['DT - 02', 'Dust Track'],
      ['DT - 03', 'Dust Track'],
      ['DT - 04', 'Dust Track'],
      ['DT - 05', 'Dust Track'],
      ['DTH - 01', 'Kop Gas Generator'],
      ['MVI - 01', 'Mercury Vapour Indicator'],
      ['ANMI - 01', 'Anemometer Indoor'],
      ['ANMI - 02', 'Anemometer Indoor - Suhu dan Kec udara'],
      ['ANMI - 03', 'Anemometer Indoor - Suhu'],
      ['ANMO - 01', 'Anemometer Outdoor'],
      ['ANM - IO - 01', 'Anemometer Indoor Outdoor'],
      ['ANM - IO - 02', 'Anemometer Indoor Outdoor'],
      ['ANM - IO - 03', 'Anemometer Indoor Outdoor'],
      ['ANM - IO - 04', 'Anemometer Indoor Outdoor'],
      ['ANM - IO - 05', 'Anemometer Indoor Outdoor'],
      ['ANM - IO - 06', 'Anemometer Indoor Outdoor'],
      ['ANM - IO - 07', 'Anemometer Indoor Outdoor'],
      ['ANM - IO - 08', 'Anemometer Indoor Outdoor'],
      ['ANM - IO - 09', 'Anemometer Indoor Outdoor'],
      ['ANM 10', 'Anemometer - Suhu dan RH'],
      ['VBR-01', 'Vibration Meter (Whole Body)'],
      ['VBR-02', 'Vibration Meter (Whole Body)'],
      ['VBR-03', 'Vibration Meter (Whole Body)'],
      ['VBR-04', 'Vibration Meter (Whole Body)'],
      ['VBR-05', 'Vibration Meter (HA-WB)'],
      ['VBR-06', 'Vibration Meter (HA-WB)'],
      ['VBR-07', 'Vibration Meter (Whole Body)'],
      ['VBR-08', 'Vibration Meter'],
      ['VBR-09', 'Vibration Meter'],
      ['VBR-10', 'Vibration Meter (HA-WB)'],
      ['VBR-11', 'Vibration Meter (HA-WB)'],
      ['VBR-12', 'Vibration Meter (HA-WB)'],
      ['VBR-13', 'Vibration Meter (HA-WB)'],
      ['VBR-14', 'Vibration Meter (HA-WB)'],
      ['VBR-15', 'Vibration Meter (Hand Arm)'],
      ['VBR-16', 'Vibration Meter (Machine)'],
      ['UVM - 01', 'UV Radiation Sensor (UV Meter) C'],
      ['UVM - 02', 'UV Radiation Sensor (UV Meter) A'],
      ['UVM - 03', 'UV Radiation Sensor (UV Meter) A'],
      ['UVM - 04', 'UV Radiation Sensor (UV Meter) A'],
      ['UVM - 05', 'UV Radiation Sensor (UV Meter) B'],
      ['UVM - 06', 'UV Radiation Sensor (UV Meter) A'],
      ['UVM - 07', 'UV Radiation Sensor (UV Meter)'],
      ['UVM - 08', 'UV Radiation Sensor (UV Meter)'],
      ['UVM - 09', 'UV Radiation Sensor (UV Meter)'],
      ['UVM - 10', 'UV Radiation Sensor (UV Meter)'],
      ['UVM - 11', 'UV Radiation Sensor (UV Meter)'],
      ['UVM - 12', 'UV Radiation Sensor (UV Meter)'],
      ['RT - 01', 'Reaction Timer'],
      ['EMF - 01', 'Electromagnetic Field (EMF) Meter'],
      ['EMF - 04', 'Electromagnetic Field (EMF) Meter'],
      ['EMF - 03', 'Electromagnetic Field (EMF) Meter'],
      ['EMF - 02', 'Electromagnetic Field (EMF) Meter'],
      ['LDT - 01', 'Laser Distance Meter'],
      ['LDT - 02', 'Laser Distance Meter'],
      ['LDT - 03', 'Laser Distance Meter'],
      ['VOC-GD 01', 'VOC Gas Detector'],
      ['VOC-GD 02', 'VOC Gas Detector'],
      ['VOC-GD 03', 'VOC Gas Detector'],
      ['VOC-GD 04', 'VOC Gas Detector'],
      ['VOC-GD 05', 'VOC Gas Detector'],
      ['VOC-GD 06', 'VOC Gas Detector'],
      ['VOC-GD 07', 'VOC Gas Detector'],
      ['VOC-GD 08', 'PID Gas Detector'],
      ['VOC-GD 09', 'PID Gas Detector'],
      ['VOC-GD 10', 'PID Gas Detector'],
      ['VOC-GD 11', 'VOC Gas Detector (PID)'],
      ['ECOM 01', 'Exhouse Gas Analyzer (ECOM)'],
      ['ECOM 02', 'Exhouse Gas Analyzer (ECOM)'],
      ['ECOM 03', 'Exhouse Gas Analyzer (ECOM)'],
      ['ECOM 04', 'Portable CO Analyzer (ECOM)'],
      ['ECOM 05', 'Portable CO Analyzer (ECOM)'],
      ['VOC-GD 12', 'PID Gas Detector'],
      ['VOC-GD 13', 'PID Gas Detector'],
      ['IAQ 01', 'Air Quality Monitor - CO2 PM 2.5'],
      ['IAQ 02', 'Air Quality Monitor - CO CO2'],
      ['IAQ 03', 'Air Quality Monitor - HCHO TVOC PM2.5 PM 10 PM 1.0'],
      ['IAQ 04', 'Air Quality Monitor - HCHO TVOC PM2.5 PM 10 PM 1.0'],
      ['IAQ 05', 'Air Quality Monitor - HCHO TVOC PM2.5 PM 10 PM 1.0'],
      ['IAQ 06', 'Air Quality Monitor - HCHO TVOC PM2.5 PM 10 PM 1.0'],
      ['IAQ 07', 'Air Quality Monitor'],
      ['IAQ 08', 'Air Quality Monitor PM 2.5 TVOC O3'],
      ['HVAS 01', 'Mobile Lab. High Volume Air Sampler Consumabler'],
      ['HVAS 02', 'Mobile Lab. High Volume Air Sampler Consumabler'],
      ['HVAS 03', 'Mobile Lab. High Volume Air Sampler Consumabler'],
      ['HVAS 04', 'Mobile Lab. High Volume Air Sampler Consumabler'],
      ['HVAS 05', 'Mobile Lab. High Volume Air Sampler Consumabler'],
      ['HVAS 06', 'Mobile Lab. High Volume Air Sampler Consumabler'],
      ['HVAS 07', 'Mobile Lab. High Volume Air Sampler Consumabler'],
      ['HVAS 08', 'Mobile Lab. High Volume Air Sampler Consumabler'],
      ['HVAS 09', 'Mobile Lab. High Volume Air Sampler Consumabler'],
      ['SCAL 01', 'Sound Callibrator'],
      ['SCAL 02', 'Sound Callibrator'],
      ['SCAL 03', 'Sound Callibrator'],
      ['SCAL 04', 'Sound Callibrator'],
      ['SCAL 05', 'Sound Callibrator'],
      ['SCAL 06', 'Sound Callibrator'],
      ['SCAL 07', 'Sound Callibrator'],
      ['SCAL 08', 'Sound Callibrator'],
      ['SCAL 09', 'Sound Callibrator'],
      ['VCL 01', 'Vibration Callibrator'],
      ['VCL 02', 'Vibration Callibrator'],
      ['VCL 03', 'Vibration Callibrator'],
      ['VCL 04', 'Vibration Callibrator'],
      ['VCL 05', 'Vibration Callibrator'],
      ['CLV 01', 'Kalibrator LVAS'],
      ['CLV 02', 'Kalibrator LVAS'],
      ['CLV 03', 'Kalibrator LVAS'],
      ['CLV 04', 'Kalibrator LVAS'],
      ['CLV 05', 'Kalibrator LVAS'],
      ['CLV 06', 'Kalibrator LVAS'],
      ['CLV 07', 'Kalibrator LVAS'],
    ];

    // Insert semua data: [kode, nama, kondisi, ketersediaan]
    const rows = daftarAlat.map(function(item) {
      return [item[0], item[1], 'Baik', 'Ready'];
    });

    if (rows.length > 0) {
      sheetKatalog.getRange(2, 1, rows.length, 4).setValues(rows);
    }

    return { success: true, message: 'Berhasil menginisialisasi ' + rows.length + ' alat ke katalog.' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}
