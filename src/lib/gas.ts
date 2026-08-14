// Deklarasi interface google untuk GAS agar TypeScript tidak error saat editor bekerja
declare const google: any;

/**
 * URL deployment endpoint Google Apps Script Web App untuk mode Vercel.
 * (Digunakan sebagai fallback/target proxy saat aplikasi dideploy di luar environment iframe GAS)
 */
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxuke6RREg2p3IWN7AUV9Eqz3Wwa1yZU8rASGKJlrBmAtYz5Sy2oyRx8jvDolb5lLsxBg/exec';

/**
 * Mock data katalog alat untuk keperluan local development & testing tanpa koneksi internet/GAS.
 */
const mockKatalogData = [
  { kode_alat: 'AL-001', nama: 'High Volume Air Sampler (Mock)', kondisi: 'Baik', ketersediaan: 'Ready' },
  { kode_alat: 'AL-002', nama: 'Sound Level Meter (Mock)', kondisi: 'Baik', ketersediaan: 'Ready' },
  { kode_alat: 'AL-003', nama: 'Gas Detector (Mock)', kondisi: 'Baik', ketersediaan: 'Dipinjam' },
  { kode_alat: 'AL-004', nama: 'Lux Meter (Mock)', kondisi: 'Rusak', ketersediaan: 'Ready' }
];

/**
 * Mendeteksi environment runtime aplikasi saat ini:
 * - `'gas'`: Berjalan di dalam iframe Google Apps Script (tersedia global `google.script.run`).
 * - `'vercel'`: Berjalan sebagai SPA di Vercel atau server lain (komunikasi melalui HTTP proxy `/api/gas`).
 * - `'dev'`: Berjalan di localhost (menggunakan mock data lokal agar dev cepat tanpa API latency).
 *
 * @returns {'gas' | 'vercel' | 'dev'} Identitas target runtime aktif
 */
export function detectEnvironment(): 'gas' | 'vercel' | 'dev' {
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
 * Memanggil fungsi backend GAS melalui Vercel API Serverless Proxy (`/api/gas`).
 * Request dikirim dengan skema same-origin ke Vercel, lalu Vercel meneruskannya ke GAS Web App.
 * Hal ini sepenuhnya mencegah error CORS (Cross-Origin Resource Sharing) di browser.
 *
 * @template T - Tipe data kembalian yang diharapkan
 * @param functionName - Nama fungsi backend di Code.js yang ingin dieksekusi
 * @param args - Argumen parameter yang akan diteruskan ke fungsi tersebut
 * @returns Promise berisi payload response JSON dari backend
 * @throws Error jika HTTP status code bukan 2xx
 */
export async function callGasViaHttp<T>(functionName: string, ...args: any[]): Promise<T> {
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
 * Bridge Universal: Memanggil fungsi backend di Google Apps Script (Code.js) dan mengembalikan Promise.
 * 
 * Secara transparan dan otomatis menangani 3 kondisi runtime:
 * 1. **GAS Native**: Membungkus callback `google.script.run` menjadi async Promise.
 * 2. **Vercel / Production Web**: Menggunakan `callGasViaHttp` ke serverless API route `/api/gas`.
 * 3. **Localhost (Dev)**: Mensimulasikan network delay dan mengembalikan dataset mock yang realistis.
 * 
 * @template T - Tipe data kembalian yang diharapkan
 * @param functionName - Nama fungsi backend yang dideklarasikan di `backend/Code.js`
 * @param args - Parameter yang dikirimkan ke fungsi backend
 * @returns Promise dengan data hasil eksekusi dari backend
 *
 * @example
 * // Mengambil daftar katalog alat
 * const response = await runServerFunction<{ success: boolean; data: Alat[] }>('getKatalogAlat');
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
      } else if (functionName === 'deleteTransaksi') {
        resolve({
          success: true,
          message: 'Transaksi berhasil dihapus dan status alat direset ke Ready (MOCK)'
        } as unknown as T);
      } else if (functionName === 'editDetailPinjam') {
        resolve({
          success: true,
          message: 'Detail pinjaman berhasil diperbarui (MOCK)'
        } as unknown as T);
      } else {
        // Reject jika tidak ada mock template untuk fungs tersebut
        reject(new Error(`[DEV MODE] Fungsi ${functionName} tidak memiliki mock data. Silakan test langsung di GAS atau tambahkan mock di src/lib/gas.ts.`));
      }
    }, 800);
  });
}
