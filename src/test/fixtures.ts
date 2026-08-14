export const mockKatalogAlat = [
  { kode_alat: 'AL-001', nama: 'High Volume Air Sampler', kondisi: 'Baik', ketersediaan: 'Ready' },
  { kode_alat: 'AL-002', nama: 'Sound Level Meter', kondisi: 'Baik', ketersediaan: 'Dipinjam' },
  { kode_alat: 'AL-003', nama: 'Gas Detector', kondisi: 'Diperingatkan', ketersediaan: 'Ready' },
];

export const mockTransaksiList = [
  {
    id_transaksi: 'TRX-ABCD1234',
    nama_peminjam: 'Budi Santoso',
    lokasi: 'PT Maju Jaya',
    tgl_pinjam: '2026-08-01',
    tgl_kembali: '2026-08-10',
    jenis_pengujian: 'PNBP',
    nomor_surat: 'ST/01/2026',
    drive_file_id_surat: null,
  },
];

export const mockFormData = {
  nama_peminjam: 'Budi Santoso',
  email: 'budi@example.com',
  lokasi: 'PT Maju Jaya, Kawasan Industri',
  jenis_pengujian: 'PNBP',
  nomor_surat: 'ST/01/2026',
  tgl_pinjam: '2026-08-01',
  tgl_kembali: '2026-08-10',
  detail: [{ kode_alat: 'AL-001', jumlah: 1 }],
};
