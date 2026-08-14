<p align="center">
  <img src="src/assets/logo.png" alt="Logo Balai K3" width="120" />
</p>

<h1 align="center">Sistem Manajemen Peminjaman Alat K3</h1>

<p align="center">
  Aplikasi web modern untuk mengelola peminjaman dan pengembalian peralatan sampling K3 (Keselamatan dan Kesehatan Kerja) secara digital.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Vite-8.0-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?logo=tailwindcss&logoColor=white" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/Vitest-TDD%20Tested-729B1B?logo=vitest&logoColor=white" alt="Vitest" />
  <img src="https://img.shields.io/badge/Google%20Apps%20Script-Backend-4285F4?logo=google&logoColor=white" alt="GAS" />
  <br/>
  <img src="https://img.shields.io/github/actions/workflow/status/RafidanAnwar/pinjamalatbk3/deploy.yml?label=CI%2FCD%20Pipeline&logo=github" alt="Deploy Status" />
  <img src="https://img.shields.io/badge/Vercel-Production-000?logo=vercel&logoColor=white" alt="Vercel" />
</p>

---

## 📋 Deskripsi

Sistem ini dirancang khusus untuk **Balai K3** guna mendigitalisasi proses peminjaman peralatan sampling lingkungan kerja. Aplikasi menggantikan proses manual berbasis formulir fisik dengan alur kerja digital yang terintegrasi langsung dengan **Google Sheets** sebagai database dan **Google Drive** sebagai penyimpanan berkas surat tugas.

### Mengapa Sistem Ini Dibutuhkan?

- **200+ unit peralatan** sampling yang perlu dipantau status ketersediaannya secara *real-time*.
- Kebutuhan **pelacakan (tracking)** peminjaman lintas tim pengujian (**PNBP**, **DIPA**, **Praktik**).
- Kebutuhan **laporan bulanan resmi format PDF** yang dapat digenerate secara otomatis.
- **Audit trail** pencatatan berkas surat tugas dan riwayat perubahan data peminjaman.

---

## 📚 Pusat Dokumentasi

Untuk memudahkan developer junior, AI assistant, dan kontributor baru, dokumentasi teknis mendalam telah dipisahkan ke dalam panduan khusus:

- 🤝 [**CONTRIBUTING.md**](file:///d:/project/peminjaman%20alat/form-alat/CONTRIBUTING.md) — Panduan kontribusi, alur git branching, dan konvensi kode.
- 🏛️ [**docs/ARSITEKTUR.md**](file:///d:/project/peminjaman%20alat/form-alat/docs/ARSITEKTUR.md) — Arsitektur sistem, strategi dual-deployment, dan pola bridge `gas.ts`.
- 🧪 [**docs/TESTING.md**](file:///d:/project/peminjaman%20alat/form-alat/docs/TESTING.md) — Panduan lengkap Test-Driven Development (TDD) dengan Vitest & MSW.

---

## ✨ Fitur Utama

### 👤 Untuk Peminjam (Halaman Publik)
- **Formulir Peminjaman Digital** — Lengkap dengan validasi *real-time* berbasis Zod dan React Hook Form.
- **Katalog Alat Live** — Menampilkan daftar alat yang berstatus **"Ready"** secara dinamis.
- **Multi-alat per Transaksi** — Meminjam beberapa alat sekaligus dalam 1 formulir pengajuan.
- **Upload Surat Tugas** — Pengunggahan dokumen surat tugas (PDF/Gambar) langsung ke Google Drive.
- **Notifikasi Cepat** — Umpan balik visual interaktif dengan toast notification.

### 🛡️ Untuk Admin / Petugas (Terkunci Autentikasi)
- **Dashboard Statistik** — Ringkasan metrik inventaris (total alat, alat ready, alat dipinjam).
- **Manajemen Katalog (CRUD)** — Pengelolaan data alat dengan 7 status ketersediaan (*Ready, Dipinjam, Kalibrasi, Maintenance, Pengusulan Lelang, Not Ready, Dimusnahkan*).
- **Manajemen Transaksi & Audit Trail** — Fitur pencarian, pembatalan order (hapus transaksi duplikat), dan pengeditan alat pinjaman dengan riwayat audit.
- **Laporan Bulanan Resmi PDF** — Ekspor rekapitulasi otomatis format standar Balai K3:
  1. Rekap tim berdasarkan jenis pengujian (PNBP / DIPA / Praktik)
  2. Uraian kegiatan operasional & kondisi pengembalian fisik alat
  3. Top 10 instrumen sampling yang paling sering dipinjam

---

## 🏗️ Arsitektur & Alur Deployment

```
┌─────────────────────────────────────────────────────────┐
│                     GitHub Repository                    │
│                  (push to main branch)                   │
└─────────────┬───────────────────────────┬───────────────┘
              │                           │
              ▼                           ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│     GitHub Actions       │  │        Vercel            │
│  ┌───────────────────┐   │  │  ┌───────────────────┐  │
│  │ 1. npm run test   │   │  │  │ npm run build:    │  │
│  │    (Vitest Suite) │   │  │  │ vercel (SPA Edge) │  │
│  └────────┬──────────┘   │  └──────────┬───────────┘  │
│           │ [Wajib Pass] │             │              │
│  ┌────────▼──────────┐   │             ▼              │
│  │ 2. npm run build: │   │      ┌──────────────┐      │
│  │    gas (Singlefile│   │      │  Vercel CDN  │      │
│  └────────┬──────────┘   │      └──────┬───────┘      │
│           │              │             │              │
│  ┌────────▼──────────┐   │             │              │
│  │ 3. clasp push &   │   │             │ HTTP fetch   │
│  │    deploy         │   │             │ (/api/gas)   │
│  └────────┬──────────┘   │             │              │
└───────────┼──────────────┘             │              │
            │                            │              │
            ▼                            ▼              │
┌───────────────────────────────────────────────────────┴─┐
│                   Google Apps Script                    │
│  - doGet() → HTML Singlefile bundle                     │
│  - doPost() → API Router untuk Vercel Proxy             │
│  - LockService → Proteksi Race-Condition                │
└───────────┬─────────────────────────────────────────────┘
            │
            ├──────────────────────────┬──────────────────────────┐
            ▼                          ▼                          ▼
┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐
│     Google Sheets     │  │     Google Drive      │  │  Sheet: LogPerubahan  │
│  (Database Transaksi) │  │  (Penyimpanan Berkas) │  │     (Audit Trail)     │
└───────────────────────┘  └───────────────────────┘  └───────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Teknologi & Library |
|---|---|
| **Frontend Framework** | React 18, TypeScript, Vite 8 |
| **Styling & Icons** | TailwindCSS 3.4, Lucide React |
| **Form & Validasi** | React Hook Form, Zod |
| **UI Primitives** | Radix UI (Dialog, Select, Toast, Label) |
| **PDF Generation** | jsPDF, jsPDF-AutoTable |
| **Testing Suite** | Vitest, React Testing Library, MSW (Mock Service Worker), jsdom |
| **Backend Runtime** | Google Apps Script (JavaScript V8 Engine) |
| **Database & Storage** | Google Sheets, Google Drive |
| **CI/CD & CLI** | GitHub Actions, Clasp (`@google/clasp`) |

---

## 📁 Struktur Direktori

```
├── .github/
│   └── workflows/
│       └── deploy.yml              # CI/CD: Automated testing & auto-deploy ke GAS
├── backend/
│   ├── .clasp.json                 # Konfigurasi project ID script GAS
│   ├── appsscript.json             # Manifest konfigurasi Google Apps Script
│   ├── Code.js                     # Backend API, Sheets CRUD, Drive upload & lock
│   ├── utils.js                    # Logika backend murni (100% testable di Node.js)
│   ├── __tests__/                  # Unit test backend
│   └── index.html                  # [Generated] Output bundle single-file untuk GAS
├── docs/
│   ├── ARSITEKTUR.md               # Dokumentasi detail arsitektur & flow data
│   └── TESTING.md                  # Panduan lengkap penulisan & eksekusi test
├── src/
│   ├── assets/                     # Asset gambar (logo Balai K3, background)
│   ├── components/
│   │   ├── ui/                     # Komponen UI reusable berbasis Radix
│   │   └── MonthlyReportGenerator.tsx # Komponen generator PDF laporan bulanan
│   ├── hooks/
│   │   └── use-toast.ts            # Hook toast notification
│   ├── lib/
│   │   ├── gas.ts                  # Universal bridge (GAS Native / Vercel / Dev)
│   │   ├── schemas.ts              # Schema validasi Zod terpusat
│   │   ├── reportUtils.ts          # Fungsi murni agregasi data laporan bulanan
│   │   ├── utils.ts                # Tailwind classnames merger helper
│   │   └── __tests__/              # Unit test untuk module lib
│   ├── pages/
│   │   ├── FormPeminjaman.tsx      # Halaman publik pengajuan peminjaman
│   │   ├── Login.tsx               # Halaman login admin/petugas
│   │   ├── AdminDashboard.tsx      # Dashboard admin manajemen inventaris & laporan
│   │   └── __tests__/              # Component tests untuk halaman utama
│   ├── test/
│   │   ├── fixtures.ts             # Dataset mock terstandarisasi untuk testing
│   │   ├── setup.ts                # Setup environment testing global
│   │   └── msw/                    # Mock Service Worker network mock
│   ├── App.tsx                     # Router utama aplikasi (HashRouter)
│   └── main.tsx                    # React DOM entry point
├── CONTRIBUTING.md                 # Panduan kontribusi developer
├── vercel.json                     # Konfigurasi routing rewrite SPA Vercel
├── vite.config.ts                  # Konfigurasi Vite & Vitest test runner
├── tailwind.config.js              # Konfigurasi TailwindCSS
├── tsconfig.json                   # Konfigurasi TypeScript
├── .gitignore                      # Filter file ter-track git
└── package.json                    # Dependensi & script manajemen proyek
```

---

## 🚀 Panduan Memulai Cepat (Quick Start)

### 1. Prasyarat
- [Node.js](https://nodejs.org/) versi 20+
- [npm](https://www.npmjs.com/) versi 9+

### 2. Jalankan di Lingkungan Lokal
```bash
# Clone repository
git clone https://github.com/RafidanAnwar/pinjamalatbk3.git
cd pinjamalatbk3

# Install dependencies (Wajib dengan flag --legacy-peer-deps)
npm install --legacy-peer-deps

# Jalankan development server
npm run dev
```

Buka `http://localhost:5173` di browser Anda. Aplikasi langsung aktif menggunakan **mock data** lokal tanpa memerlukan setup Google Account!

---

## 🧪 Menjalankan Pengujian (Testing)

Proyek ini dilengkapi dengan **49+ automated test cases** yang mencakup validasi schema, logika backend, helper laporan, dan interaksi komponen React.

```bash
# Menjalankan seluruh test suite sekali
npm run test

# Menjalankan test dalam mode watch interaktif
npm run test:watch

# Menjalankan test dan menghasilkan laporan coverage
npm run test:coverage
```

---

## ⚙️ Setup Otomasi CI/CD & Deploy

### GitHub Actions → Google Apps Script
Setiap kali Anda melakukan `git push` ke branch `main`, GitHub Actions akan:
1. Menjalankan seluruh test suite (`npm run test:coverage`).
2. Mengunggah laporan test coverage sebagai artifact GitHub.
3. Melakukan build React single-file (`npm run build:gas`).
4. Mengunggah kode baru ke Google Apps Script via `clasp` **tanpa mengubah URL yang sudah ada dan tanpa pernah menghapus data di Google Sheets**.

**Konfigurasi Secrets GitHub**:
Tambahkan 2 secrets di [GitHub Settings → Secrets and variables → Actions](https://github.com/RafidanAnwar/pinjamalatbk3/settings/secrets/actions):
- `CLASP_TOKEN`: Seluruh isi string JSON dari file `~/.clasprc.json` akun Anda.
- `GAS_DEPLOYMENT_ID`: ID deployment Web App dari Google Apps Script.

---

## 🔧 Troubleshooting & FAQ

<details>
<summary><b>1. Error saat menjalankan <code>npm install</code>?</b></summary>
Pastikan Anda menambahkan flag <code>--legacy-peer-deps</code> karena beberapa paket UI menggunakan peer-dependencies React 18:
<pre>npm install --legacy-peer-deps</pre>
</details>

<details>
<summary><b>2. Apakah push ke GitHub akan menghapus data di Spreadsheet?</b></summary>
<b>Tidak pernah.</b> Perintah <code>clasp push</code> dan <code>clasp deploy</code> hanya memperbarui file skrip (<code>.js</code> dan <code>.html</code>) di project Google Apps Script. Baris data di Google Sheets dan file di Google Drive tetap aman dan tidak tersentuh.
</details>

<details>
<summary><b>3. Mengapa ada dua perintah build berbeda?</b></summary>
<ul>
  <li><code>npm run build:gas</code> menghasilkan 1 file <code>backend/index.html</code> mandiri (HTML+CSS+JS inline) agar kompatibel dengan lingkungan sandbox Google Apps Script.</li>
  <li><code>npm run build:vercel</code> menghasilkan folder <code>dist/</code> dengan code splitting standar untuk hosting di web server modern / Vercel.</li>
</ul>
</details>

---

## 📄 Lisensi

Hak Cipta © 2026 Balai K3. Dikembangkan untuk keperluan internal pengelolaan peralatan sampling lingkungan kerja.
