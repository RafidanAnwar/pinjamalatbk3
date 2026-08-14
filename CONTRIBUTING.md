# 🤝 Panduan Kontribusi (Contributing Guide)

Terima kasih atas minat Anda untuk berkontribusi pada sistem **Manajemen Peminjaman Alat K3**! Dokumen ini dirancang khusus untuk memandu developer junior, kontributor baru, maupun AI assistant dalam memahami standar dan alur pengembangan proyek ini.

---

## 📋 Daftar Isi
1. [Persiapan Lingkungan Pengembangan](#1-persiapan-lingkungan-pengembangan)
2. [Struktur dan Peta File Kunci](#2-struktur-dan-peta-file-kunci)
3. [Standar Penulisan Kode](#3-standar-penulisan-kode)
4. [Alur Kerja Git & Pull Request](#4-alur-kerja-git--pull-request)
5. [Menjalankan dan Menulis Test](#5-menjalankan-dan-menulis-test)
6. [Catatan Keamanan & Google Sheets](#6-catatan-keamanan--google-sheets)

---

## 1. Persiapan Lingkungan Pengembangan

### Prasyarat
- **Node.js**: Versi 20 atau lebih baru ([Unduh Node.js](https://nodejs.org/))
- **npm**: Versi 9 atau lebih baru
- **Git**: Versi 2.30+

### Langkah Setup Awal
```bash
# 1. Clone repositori
git clone https://github.com/RafidanAnwar/pinjamalatbk3.git
cd pinjamalatbk3

# 2. Install dependencies (Wajib gunakan flag --legacy-peer-deps)
npm install --legacy-peer-deps

# 3. Jalankan aplikasi di mode lokal (Development)
npm run dev
```

Buka browser di `http://localhost:5173`. Aplikasi akan berjalan menggunakan **mock data** lokal sehingga Anda dapat langsung bereksperimen tanpa memerlukan setup Google Apps Script atau Sheets!

---

## 2. Struktur dan Peta File Kunci

Berikut adalah file-file penting yang sering diakses saat mengembangkan fitur baru:

| File / Direktori | Deskripsi & Tanggung Jawab |
|---|---|
| [`src/lib/gas.ts`](file:///d:/project/peminjaman%20alat/form-alat/src/lib/gas.ts) | **Bridge Backend**: Menangani pemanggilan fungsi server baik di GAS native, Vercel proxy, maupun mock dev. |
| [`src/lib/schemas.ts`](file:///d:/project/peminjaman%20alat/form-alat/src/lib/schemas.ts) | **Validasi Terpusat**: Semua skema validasi Zod untuk formulir publik & katalog admin. |
| [`src/lib/reportUtils.ts`](file:///d:/project/peminjaman%20alat/form-alat/src/lib/reportUtils.ts) | **Logika Laporan**: Agregasi data murni untuk 3 tabel rekapitulasi laporan bulanan. |
| [`backend/Code.js`](file:///d:/project/peminjaman%20alat/form-alat/backend/Code.js) | **Backend GAS**: Berisi `doGet`, `doPost`, manipulasi Google Sheets & Drive. |
| [`backend/utils.js`](file:///d:/project/peminjaman%20alat/form-alat/backend/utils.js) | **Logika Backend Murni**: Validasi dan parsing tanpa dependensi Google API agar 100% bisa di-test di Node.js. |
| [`src/pages/FormPeminjaman.tsx`](file:///d:/project/peminjaman%20alat/form-alat/src/pages/FormPeminjaman.tsx) | Halaman publik pengajuan peminjaman alat sampling. |
| [`src/pages/AdminDashboard.tsx`](file:///d:/project/peminjaman%20alat/form-alat/src/pages/AdminDashboard.tsx) | Dashboard admin untuk katalog alat, riwayat peminjaman, & laporan bulanan. |

---

## 3. Standar Penulisan Kode

1. **TypeScript Wajib**: Semua file baru di dalam `src/` harus berekstensi `.ts` atau `.tsx`. Hindari penggunaan `any` jika tipe data spesifik dapat didefinisikan.
2. **Pisahkan Logika Murni (Pure Functions)**:
   - Jika Anda membuat kalkulasi atau validasi data, letakkan di `src/lib/` atau `backend/utils.js`.
   - Hal ini memudahkan pembuatan Unit Test otomatis tanpa memerlukan browser DOM atau SpreadsheetApp.
3. **Dokumentasikan dengan JSDoc / TSDoc**:
   - Berikan komentar singkat di atas fungsi baru yang menjelaskan `@param`, `@returns`, serta kegunaannya.
4. **Komponen UI Reusable**:
   - Gunakan komponen dasar yang sudah ada di `src/components/ui/` (berbasis Radix UI & TailwindCSS).

---

## 4. Alur Kerja Git & Pull Request

1. **Buat Branch Baru dari `main`**:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feat/nama-fitur-baru
   ```
   *Gunakan prefix yang jelas, contoh: `feat/` (fitur), `fix/` (bug fix), `docs/` (dokumentasi), `test/` (pengujian).*

2. **Commit dengan Format Pesan Konvensional**:
   - `feat: tambah filter pencarian berdasarkan tanggal`
   - `fix: perbaiki validasi nomor surat tugas`
   - `docs: perbarui panduan kontribusi`
   - `test: tambah unit test untuk kalkulasi agregasi laporan`

3. **Pastikan Seluruh Test Lulus**:
   ```bash
   npm run test
   ```
   *Pull request tidak akan di-merge jika masih ada test yang gagal.*

4. **Buat Pull Request (PR)**:
   - Push branch Anda ke GitHub dan buka PR ke branch `main`.
   - GitHub Actions akan otomatis menjalankan seluruh test suite untuk memvalidasi integritas kode.

---

## 5. Menjalankan dan Menulis Test

Proyek ini menerapkan **Test-Driven Development (TDD)** dengan Vitest dan React Testing Library.

```bash
# Menjalankan seluruh test suite sekali
npm run test

# Menjalankan test dalam mode pantau (watch mode saat coding)
npm run test:watch

# Menghasilkan laporan cakupan kode (coverage report)
npm run test:coverage
```

Untuk panduan lengkap cara menulis test unit, mock MSW, dan testing komponen, silakan baca [📖 Panduan Pengujian (docs/TESTING.md)](file:///d:/project/peminjaman%20alat/form-alat/docs/TESTING.md).

---

## 6. Catatan Keamanan & Google Sheets

- ⚠️ **Kredensial Clasp**: Jangan pernah meng-commit file `.clasprc.json` atau token otentikasi Google ke repositori publik.
- 🛡️ **Integritas Data Google Sheets**: Proses deployment (`clasp push`) **TIDAK PERNAH** menghapus atau menimpa baris data di Google Sheets. Deployment hanya memperbarui kode JavaScript backend dan file bundle frontend.
