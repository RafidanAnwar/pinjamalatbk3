import { describe, it, expect } from 'vitest';
import {
  generateIdTransaksi,
  validateDataPeminjaman,
  validateDetailPinjam,
  parseKatalogRows,
  parseTransaksiRows,
} from '../utils.js';

describe('generateIdTransaksi', () => {
  it('harus menghasilkan ID dengan format TRX-XXXXXXXX (8 karakter alfanumerik)', () => {
    const id = generateIdTransaksi();
    expect(id).toMatch(/^TRX-[A-Z0-9]{8}$/);
  });

  it('harus menghasilkan ID yang unik dan acak', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateIdTransaksi()));
    expect(ids.size).toBe(100);
  });
});

describe('validateDataPeminjaman', () => {
  const validData = {
    nama_peminjam: 'Budi Santoso',
    email: 'budi@example.com',
    lokasi: 'PT Maju Jaya',
    tgl_pinjam: '2026-08-01',
    tgl_kembali: '2026-08-10',
  };

  it('harus valid untuk data peminjaman yang lengkap dan benar', () => {
    const res = validateDataPeminjaman(validData);
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it('harus mendeteksi nama peminjam yang kosong', () => {
    const res = validateDataPeminjaman({ ...validData, nama_peminjam: '   ' });
    expect(res.valid).toBe(false);
    expect(res.errors).toContain('nama_peminjam wajib diisi');
  });

  it('harus mendeteksi format email yang tidak mengandung @', () => {
    const res = validateDataPeminjaman({ ...validData, email: 'budi-tanpa-at' });
    expect(res.valid).toBe(false);
    expect(res.errors).toContain('email tidak valid');
  });

  it('harus mendeteksi jika lokasi kosong', () => {
    const res = validateDataPeminjaman({ ...validData, lokasi: '' });
    expect(res.valid).toBe(false);
    expect(res.errors).toContain('lokasi wajib diisi');
  });

  it('harus mendeteksi tanggal pinjam atau kembali yang kosong', () => {
    const res = validateDataPeminjaman({ ...validData, tgl_pinjam: '', tgl_kembali: '' });
    expect(res.valid).toBe(false);
    expect(res.errors).toContain('tgl_pinjam wajib diisi');
    expect(res.errors).toContain('tgl_kembali wajib diisi');
  });

  it('harus mendeteksi tanggal kembali sebelum tanggal pinjam', () => {
    const res = validateDataPeminjaman({
      ...validData,
      tgl_pinjam: '2026-08-10',
      tgl_kembali: '2026-08-01',
    });
    expect(res.valid).toBe(false);
    expect(res.errors).toContain('tgl_kembali tidak boleh sebelum tgl_pinjam');
  });
});

describe('validateDetailPinjam', () => {
  it('harus valid untuk daftar alat yang benar', () => {
    const res = validateDetailPinjam([
      { kode_alat: 'AL-001', jumlah: 2 },
      { kode_alat: 'AL-002', jumlah: 1 },
    ]);
    expect(res.valid).toBe(true);
  });

  it('harus gagal jika daftar alat kosong atau bukan array', () => {
    expect(validateDetailPinjam([]).valid).toBe(false);
    expect(validateDetailPinjam(null).valid).toBe(false);
  });

  it('harus mendeteksi jika kode_alat kosong atau jumlah kurang dari 1', () => {
    const res = validateDetailPinjam([
      { kode_alat: '', jumlah: 1 },
      { kode_alat: 'AL-002', jumlah: 0 },
    ]);
    expect(res.valid).toBe(false);
    expect(res.errors).toContain('Baris 1: kode_alat wajib diisi');
    expect(res.errors).toContain('Baris 2: jumlah minimal 1');
  });
});

describe('parseKatalogRows', () => {
  it('harus mengabaikan baris header dan mem-parse baris data dengan benar', () => {
    const rawRows = [
      ['kode_alat', 'nama', 'kondisi', 'ketersediaan'],
      ['AL-001', 'HVAS', 'Baik', 'Ready'],
      ['AL-002', 'Sound Level Meter', 'Baik', 'Dipinjam'],
    ];
    const parsed = parseKatalogRows(rawRows);
    expect(parsed).toEqual([
      { kode_alat: 'AL-001', nama: 'HVAS', kondisi: 'Baik', ketersediaan: 'Ready' },
      { kode_alat: 'AL-002', nama: 'Sound Level Meter', kondisi: 'Baik', ketersediaan: 'Dipinjam' },
    ]);
  });

  it('harus mengembalikan array kosong jika baris hanya header atau kosong', () => {
    expect(parseKatalogRows([])).toEqual([]);
    expect(parseKatalogRows([['header', 'col']])).toEqual([]);
  });
});

describe('parseTransaksiRows', () => {
  it('harus mem-parse baris transaksi dari sheet dengan benar', () => {
    const rawRows = [
      ['id_transaksi', 'nama_peminjam', 'email', 'lokasi', 'tgl_pinjam', 'tgl_kembali', 'drive_file_id_surat', 'jenis_pengujian', 'nomor_surat'],
      ['TRX-001', 'Budi', 'budi@test.com', 'Jakarta', '2026-08-01', '2026-08-05', 'file-123', 'PNBP', 'ST/01'],
    ];
    const parsed = parseTransaksiRows(rawRows);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id_transaksi).toBe('TRX-001');
    expect(parsed[0].nama_peminjam).toBe('Budi');
    expect(parsed[0].jenis_pengujian).toBe('PNBP');
  });
});
