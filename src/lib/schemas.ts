import { z } from 'zod';

/**
 * Schema validasi formulir peminjaman alat K3 (digunakan di halaman publik FormPeminjaman).
 * Memvalidasi identitas peminjam, informasi surat tugas, rentang waktu, dan daftar alat yang dipinjam.
 */
export const formPeminjamanSchema = z.object({
  /** Nama lengkap peminjam (minimal 3 karakter) */
  nama_peminjam: z.string().min(3, { message: 'Nama minimal 3 karakter' }),
  /** Alamat email valid untuk konfirmasi dan korespondensi */
  email: z.string().email({ message: 'Format email tidak valid' }),
  /** Lokasi sampling / pengujian lapangan (minimal 5 karakter) */
  lokasi: z.string().min(5, { message: 'Lokasi minimal 5 karakter' }),
  /** Kategori jenis pengujian: PNBP, DIPA, atau Praktik */
  jenis_pengujian: z.string().min(1, { message: 'Jenis pengujian harus dipilih' }),
  /** Nomor resmi surat tugas dari instansi */
  nomor_surat: z.string().min(1, { message: 'Nomor surat tugas harus diisi' }),
  /** Tanggal mulai peminjaman (format YYYY-MM-DD) */
  tgl_pinjam: z.string().min(1, { message: 'Tanggal pinjam harus diisi' }),
  /** Tanggal rencana pengembalian (format YYYY-MM-DD) */
  tgl_kembali: z.string().min(1, { message: 'Tanggal kembali harus diisi' }),
  /** Daftar rincian alat yang dipinjam (minimal 1 unit alat) */
  detail: z.array(z.object({
    /** Kode unik alat (contoh: HSM 01, SLM 05) */
    kode_alat: z.string().min(1, { message: 'Pilih alat' }),
    /** Kuantitas peminjaman (minimal 1) */
    jumlah: z.number().min(1, { message: 'Minimal 1' })
  })).min(1, { message: 'Pilih minimal 1 alat' })
});

/** Tipe data inferensi TypeScript dari formPeminjamanSchema */
export type FormPeminjamanValues = z.infer<typeof formPeminjamanSchema>;

/**
 * Schema validasi penambahan / pengeditan data alat di KatalogAlat (Admin Dashboard).
 */
export const alatSchema = z.object({
  /** Kode unik inventaris alat (Primary Key) */
  kode_alat: z.string().min(1, { message: 'Kode alat harus diisi' }),
  /** Nama lengkap alat / instrumen sampling */
  nama: z.string().min(3, { message: 'Nama alat minimal 3 karakter' }),
  /** Kondisi fisik operasional alat */
  kondisi: z.enum(['Baik', 'Diperingatkan', 'Rusak']),
  /** Status ketersediaan alat dalam siklus peminjaman/pemeliharaan */
  ketersediaan: z.enum([
    'Ready',
    'Dipinjam',
    'Kalibrasi',
    'Maintenance',
    'Pengusulan Lelang',
    'Not Ready',
    'Dimusnahkan'
  ]),
});

/** Tipe data inferensi TypeScript dari alatSchema */
export type AlatFormValues = z.infer<typeof alatSchema>;

