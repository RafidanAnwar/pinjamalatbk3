// Deklarasi interface google untuk GAS agar TS tidak error saat di editor
declare const google: any;

// URL GAS Web App untuk mode Vercel (menggunakan deployment URL yang sudah ada)
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxuke6RREg2p3IWN7AUV9Eqz3Wwa1yZU8rASGKJlrBmAtYz5Sy2oyRx8jvDolb5lLsxBg/exec';

// Global mock state for development
const mockKatalogData = [
  { kode_alat: 'AL-001', nama: 'High Volume Air Sampler (Mock)', kondisi: 'Baik', ketersediaan: 'Ready' },
  { kode_alat: 'AL-002', nama: 'Sound Level Meter (Mock)', kondisi: 'Baik', ketersediaan: 'Ready' },
  { kode_alat: 'AL-003', nama: 'Gas Detector (Mock)', kondisi: 'Baik', ketersediaan: 'Dipinjam' },
  { kode_alat: 'AL-004', nama: 'Lux Meter (Mock)', kondisi: 'Rusak', ketersediaan: 'Ready' }
];

/**
 * Deteksi environment saat ini:
 * - 'gas': berjalan di dalam iframe Google Apps Script (google.script.run tersedia)
 * - 'vercel': berjalan di Vercel/standalone (komunikasi via HTTP fetch ke GAS Web App)
 * - 'dev': berjalan di localhost (gunakan mock data)
 */
function detectEnvironment(): 'gas' | 'vercel' | 'dev' {
  // Cek apakah ada google.script.run (GAS iframe)
  if (typeof google !== 'undefined' && google.script && google.script.run) {
    return 'gas';
  }
  
  // Cek apakah di-build untuk Vercel
  if (import.meta.env.VITE_DEPLOY_TARGET === 'vercel') {
    return 'vercel';
  }
  
  // Default: dev mode (localhost)
  return 'dev';
}

/**
 * Memanggil fungsi di Code.gs via Vercel proxy (untuk mode Vercel).
 * Request dikirim ke /api/gas (same-origin) yang kemudian forward ke GAS.
 * Ini menghindari masalah CORS karena browser hanya berkomunikasi dengan Vercel.
 */
async function callGasViaHttp<T>(functionName: string, ...args: any[]): Promise<T> {
  const response = await fetch('/api/gas', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: functionName,
      params: args,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();
  return result as T;
}

/**
 * Memanggil fungsi di Code.gs (Google Apps Script) dan mengembalikan Promise.
 * Secara otomatis mendeteksi environment:
 * - GAS: menggunakan google.script.run
 * - Vercel: menggunakan HTTP fetch ke GAS Web App
 * - Dev: menggunakan mock response
 * 
 * @param functionName Nama fungsi backend yang ada di Code.gs
 * @param args Argumen yang akan dikirim ke fungsi backend
 * @returns Promise dengan hasil balikan dari backend (atau mock di localhost)
 */
export function runServerFunction<T = any>(functionName: string, ...args: any[]): Promise<T> {
  const env = detectEnvironment();

  // === MODE GAS: gunakan google.script.run ===
  if (env === 'gas') {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler((result: T) => resolve(result))
        .withFailureHandler((error: any) => reject(error))
        [functionName](...args);
    });
  }

  // === MODE VERCEL: gunakan HTTP fetch ke GAS Web App ===
  if (env === 'vercel') {
    return callGasViaHttp<T>(functionName, ...args);
  }

  // === MODE DEV: gunakan mock data ===
  return new Promise((resolve, reject) => {
    console.warn(`[DEV MODE] google.script.run.${functionName} dipanggil dengan argumen:`, args);
    
    setTimeout(() => {
      // Berikan mock data khusus berdasarkan nama fungsi
      if (functionName === 'authenticatePetugas') {
        resolve({ 
          success: true, 
          token: 'mock-token-1234', 
          user: { username: args[0] || 'admin', nama_petugas: 'Admin Mock' },
          message: 'Login berhasil (MOCK)'
        } as unknown as T);
      } else if (functionName === 'submitPeminjaman' || functionName === 'submitPeminjamanLengkap') {
        // Update mock catalog status
        const dataDetailPinjam = args[1] || [];
        dataDetailPinjam.forEach((item: any) => {
          const alat = mockKatalogData.find(a => a.kode_alat === item.kode_alat);
          if (alat) {
            alat.ketersediaan = 'Dipinjam';
          }
        });

        // Simulate network delay for upload + submit (still faster than 2 real calls)
        resolve({ 
          success: true, 
          id_transaksi: 'TRX-MOCKX9D', 
          message: 'Data Peminjaman berhasil disimpan (MOCK)' 
        } as unknown as T);
      } else if (functionName === 'uploadFileToDrive') {
        resolve({ 
          success: true, 
          drive_file_id: 'mock-file-id-abc',
          url: 'http://mock-drive.test/file'
        } as unknown as T);
      } else if (functionName === 'getKatalogAlat') {
        resolve({
          success: true,
          data: [...mockKatalogData]
        } as unknown as T);
      } else if (functionName === 'getPeminjamanList') {
        resolve({
           success: true,
           data: [
             { id_transaksi: 'TRX-171829384', nama_peminjam: 'John Doe', lokasi: 'PT Makmur Jaya', tgl_pinjam: '2024-10-12', tgl_kembali: '2024-10-15', drive_file_id_surat: 'mock-file-123', jenis_pengujian: 'PNBP', nomor_surat: 'ST/01/2026' },
             { id_transaksi: 'TRX-171829400', nama_peminjam: 'Jane Smith', lokasi: 'PLTU Jawa', tgl_pinjam: '2024-10-16', tgl_kembali: '2024-10-20', drive_file_id_surat: 'mock-file-456', jenis_pengujian: 'DIPA', nomor_surat: 'ST/02/2026' }
           ]
        } as unknown as T);
      } else if (functionName === 'getDetailTransaksi') {
        const mockTrxId = args[0];
        resolve({
          success: true,
          data: [
            { kode_alat: 'AL-001', nama: 'High Volume Air Sampler (Mock)', kondisi: 'Baik', jumlah: 1 },
            { kode_alat: 'AL-002', nama: 'Sound Level Meter (Mock)', kondisi: 'Baik', jumlah: 1 }
          ]
        } as unknown as T);
      } else if (functionName === 'getLaporanPeminjamanDetailed') {
        resolve({
           success: true,
           data: [
             { id: 'TRX-171829384-HSM01', tanggalPinjam: '2024-10-12', jenisPengujian: 'PNBP', namaAlat: 'High Volume Air Sampler', jumlahPinjam: 1, status: 'Selesai', kondisiKembali: 'Baik' },
             { id: 'TRX-171829400-SLM02', tanggalPinjam: '2024-10-16', jenisPengujian: 'DIPA', namaAlat: 'Sound Level Meter', jumlahPinjam: 2, status: 'Selesai', kondisiKembali: 'Baik' }
           ]
        } as unknown as T);
      } else if (functionName === 'addAlat') {
        resolve({
          success: true,
          id: 'mock-id-' + Date.now(),
          message: 'Mock alat berhasil ditambahkan'
        } as unknown as T);
      } else if (functionName === 'editAlat') {
        resolve({
          success: true,
          message: 'Mock alat berhasil diubah'
        } as unknown as T);
      } else {
        // Reject jika tidak ada mock template untuk fungs tersebut
        reject(new Error(`[DEV MODE] Fungsi ${functionName} tidak memiliki mock data. Silakan test langsung di GAS atau tambahkan mock di src/lib/gas.ts.`));
      }
    }, 800);
  });
}
