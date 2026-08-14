import { describe, it, expect } from 'vitest';
import { aggregateReportData, Transaction } from '../reportUtils';

const mockTransactions: Transaction[] = [
  {
    id: 'TRX-001-A',
    id_transaksi: 'TRX-001',
    tanggalPinjam: '2026-08-05',
    jenisPengujian: 'PNBP',
    namaAlat: 'High Volume Air Sampler',
    jumlahPinjam: 1,
    status: 'Selesai',
    kondisiKembali: 'Baik',
  },
  {
    id: 'TRX-001-B',
    id_transaksi: 'TRX-001',
    tanggalPinjam: '2026-08-05',
    jenisPengujian: 'PNBP',
    namaAlat: 'Sound Level Meter',
    jumlahPinjam: 2,
    status: 'Selesai',
    kondisiKembali: 'Baik',
  },
  {
    id: 'TRX-002-A',
    id_transaksi: 'TRX-002',
    tanggalPinjam: '2026-08-12',
    jenisPengujian: 'DIPA',
    namaAlat: 'Gas Detector',
    jumlahPinjam: 1,
    status: 'Selesai',
    kondisiKembali: 'Rusak',
  },
  {
    id: 'TRX-003-A',
    id_transaksi: 'TRX-003',
    tanggalPinjam: '2026-08-20',
    jenisPengujian: 'PNBP',
    namaAlat: 'Sound Level Meter',
    jumlahPinjam: 1,
    status: 'Selesai',
    kondisiKembali: 'Diperbaiki',
  },
  // Transaksi bulan berbeda (September 2026) — tidak boleh masuk ke laporan Agustus 2026
  {
    id: 'TRX-004-A',
    id_transaksi: 'TRX-004',
    tanggalPinjam: '2026-09-01',
    jenisPengujian: 'PNBP',
    namaAlat: 'High Volume Air Sampler',
    jumlahPinjam: 5,
    status: 'Selesai',
    kondisiKembali: 'Baik',
  },
];

describe('reportUtils — aggregateReportData', () => {
  it('harus memfilter transaksi sesuai bulan dan tahun yang dipilih (Agustus 2026)', () => {
    const result = aggregateReportData(mockTransactions, 8, 2026);
    expect(result.filteredTransactions).toHaveLength(4);
  });

  it('harus menghitung rekap tim berdasarkan jenis pengujian dengan benar (Tabel 1)', () => {
    const result = aggregateReportData(mockTransactions, 8, 2026);
    // PNBP ada 2 transaksi unik (TRX-001 dan TRX-003)
    // DIPA ada 1 transaksi unik (TRX-002)
    const pnbp = result.tabel1Data.find(item => item[1] === 'PNBP');
    const dipa = result.tabel1Data.find(item => item[1] === 'DIPA');

    expect(pnbp).toBeDefined();
    expect(pnbp![2]).toBe(2); // 2 tim/transaksi unik
    expect(dipa).toBeDefined();
    expect(dipa![2]).toBe(1); // 1 tim/transaksi unik
    expect(result.totalSeluruhTim).toBe(3);
  });

  it('harus menghitung uraian kegiatan dengan benar (Tabel 2)', () => {
    const result = aggregateReportData(mockTransactions, 8, 2026);
    // Total permintaan = 3 (TRX-001, TRX-002, TRX-003)
    expect(result.totalPermintaan).toBe(3);
    // Total unit = 1 + 2 + 1 + 1 = 5
    expect(result.totalUnit).toBe(5);
    // Unit baik = 1 + 2 = 3
    expect(result.unitBaik).toBe(3);
    // Unit rusak = 1
    expect(result.unitRusak).toBe(1);
    // Unit diperbaiki = 1
    expect(result.unitDiperbaiki).toBe(1);
    // Unit hilang = 0
    expect(result.unitHilang).toBe(0);
  });

  it('harus mengurutkan alat yang sering dipinjam secara descending (Tabel 3)', () => {
    const result = aggregateReportData(mockTransactions, 8, 2026);
    // Sound Level Meter: 2 + 1 = 3 unit
    // High Volume Air Sampler: 1 unit
    // Gas Detector: 1 unit
    expect(result.tabel3Data[0][1]).toBe('Sound Level Meter');
    expect(result.tabel3Data[0][2]).toBe(3);
  });

  it('harus mengembalikan data kosong jika tidak ada transaksi yang cocok', () => {
    const result = aggregateReportData(mockTransactions, 1, 2025);
    expect(result.filteredTransactions).toHaveLength(0);
    expect(result.totalPermintaan).toBe(0);
    expect(result.totalUnit).toBe(0);
    expect(result.tabel1Data).toHaveLength(0);
    expect(result.tabel3Data).toHaveLength(0);
  });
});
