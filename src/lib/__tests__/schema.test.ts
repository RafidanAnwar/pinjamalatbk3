import { describe, it, expect } from 'vitest';
import { formPeminjamanSchema, alatSchema } from '../schemas';

describe('formPeminjamanSchema (Zod validation)', () => {
  const validFormData = {
    nama_peminjam: 'Budi Santoso',
    email: 'budi@example.com',
    lokasi: 'PT Maju Jaya, Kawasan Industri',
    jenis_pengujian: 'PNBP',
    nomor_surat: 'ST/01/2026',
    tgl_pinjam: '2026-08-01',
    tgl_kembali: '2026-08-10',
    detail: [{ kode_alat: 'AL-001', jumlah: 1 }],
  };

  it('harus berhasil validasi untuk data form yang lengkap dan benar', () => {
    const result = formPeminjamanSchema.safeParse(validFormData);
    expect(result.success).toBe(true);
  });

  it('harus gagal jika nama_peminjam kurang dari 3 karakter', () => {
    const result = formPeminjamanSchema.safeParse({
      ...validFormData,
      nama_peminjam: 'AB',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('minimal 3 karakter');
    }
  });

  it('harus gagal jika format email salah', () => {
    const result = formPeminjamanSchema.safeParse({
      ...validFormData,
      email: 'bukan-email-valid',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('tidak valid');
    }
  });

  it('harus gagal jika detail alat kosong (tanpa alat)', () => {
    const result = formPeminjamanSchema.safeParse({
      ...validFormData,
      detail: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Pilih minimal 1 alat');
    }
  });

  it('harus gagal jika ada baris alat dengan kode_alat kosong atau jumlah < 1', () => {
    const result = formPeminjamanSchema.safeParse({
      ...validFormData,
      detail: [{ kode_alat: '', jumlah: 0 }],
    });
    expect(result.success).toBe(false);
  });
});

describe('alatSchema (Katalog Alat validation)', () => {
  const validAlat = {
    kode_alat: 'AL-001',
    nama: 'High Volume Air Sampler',
    kondisi: 'Baik' as const,
    ketersediaan: 'Ready' as const,
  };

  it('harus berhasil validasi untuk data alat yang valid', () => {
    const result = alatSchema.safeParse(validAlat);
    expect(result.success).toBe(true);
  });

  it('harus gagal jika kode_alat kosong', () => {
    const result = alatSchema.safeParse({ ...validAlat, kode_alat: '' });
    expect(result.success).toBe(false);
  });

  it('harus gagal jika kondisi di luar enum (Baik, Diperingatkan, Rusak)', () => {
    const result = alatSchema.safeParse({
      ...validAlat,
      kondisi: 'Hancur' as any,
    });
    expect(result.success).toBe(false);
  });

  it('harus gagal jika ketersediaan bukan enum yang valid', () => {
    const result = alatSchema.safeParse({
      ...validAlat,
      ketersediaan: 'Tersedia' as any,
    });
    expect(result.success).toBe(false);
  });
});
