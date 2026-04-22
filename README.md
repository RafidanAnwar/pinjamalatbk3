<p align="center">
  <img src="src/assets/logo.png" alt="Logo Balai K3" width="120" />
</p>

<h1 align="center">Sistem Manajemen Peminjaman Alat K3</h1>

<p align="center">
  Aplikasi web untuk mengelola peminjaman dan pengembalian peralatan sampling K3 (Keselamatan dan Kesehatan Kerja) secara digital.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Vite-8.0-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?logo=tailwindcss&logoColor=white" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/Google%20Apps%20Script-Backend-4285F4?logo=google&logoColor=white" alt="GAS" />
  <br/>
  <img src="https://img.shields.io/github/actions/workflow/status/RafidanAnwar/pinjamalatbk3/deploy.yml?label=GAS%20Deploy&logo=github" alt="Deploy Status" />
  <img src="https://img.shields.io/badge/Vercel-Deployed-000?logo=vercel&logoColor=white" alt="Vercel" />
</p>

---

## 📋 Deskripsi

Sistem ini dirancang untuk **Balai K3** guna mendigitalisasi proses peminjaman peralatan sampling lingkungan kerja. Aplikasi menggantikan proses manual berbasis kertas dengan workflow digital yang terintegrasi dengan Google Sheets sebagai database dan Google Drive sebagai penyimpanan dokumen.

### Mengapa Sistem Ini Dibutuhkan?

- **200+ unit peralatan** sampling yang perlu dikelola status ketersediaannya secara real-time
- Kebutuhan **tracking** peminjaman lintas tim pengujian (PNBP, DIPA, Praktik)
- Kebutuhan **laporan bulanan** rekapitulasi peminjaman secara otomatis
- **Audit trail** dokumen surat tugas untuk setiap peminjaman

---

## ✨ Fitur Utama

### 👤 Untuk Peminjam (Public)
- **Form Peminjaman Digital** — Formulir lengkap dengan validasi real-time (Zod + React Hook Form)
- **Katalog Alat Live** — Menampilkan hanya peralatan dengan status "Ready"
- **Multi-alat per Transaksi** — Pinjam beberapa alat sekaligus dalam 1 form
- **Upload Surat Tugas** — Upload dokumen PDF/gambar langsung ke Google Drive
- **Notifikasi Real-time** — Feedback sukses/gagal dengan toast notification

### 🛡️ Untuk Admin/Petugas (Authenticated)
- **Dashboard Admin** — Panel kontrol dengan statistik ringkas (total alat, alat ready, alat dipinjam)
- **Manajemen Katalog** — CRUD peralatan dengan 7 status ketersediaan (Ready, Dipinjam, Kalibrasi, Maintenance, Pengusulan Lelang, Not Ready, Dimusnahkan)
- **Riwayat Transaksi** — Pencarian dan paginasi untuk seluruh riwayat peminjaman
- **Akses Dokumen** — Link langsung ke surat tugas di Google Drive
- **Laporan Bulanan PDF** — Generate rekapitulasi bulanan otomatis dengan format resmi, meliputi:
  - Rekap tim berdasarkan jenis pengujian
  - Uraian kegiatan (total permintaan, unit dipinjam, kondisi pengembalian)
  - Top 10 alat paling sering dipinjam

---

## 🏗️ Arsitektur

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
│  │  npm run build:gas │   │  │  │ npm run build:vercel│ │
│  │  (single HTML)     │   │  │  │ (SPA multi-file)   │ │
│  └────────┬──────────┘   │  │  └────────┬──────────┘  │
│           │              │  │            │             │
│  ┌────────▼──────────┐   │  │  ┌────────▼──────────┐  │
│  │   clasp push +     │   │  │  │   Vercel CDN      │  │
│  │   clasp deploy     │   │  │  │   (Global Edge)   │  │
│  └────────┬──────────┘   │  │  └────────┬──────────┘  │
└───────────┼──────────────┘  └───────────┼─────────────┘
            │                             │
            ▼                             │
┌─────────────────────────┐               │
│  Google Apps Script      │◄──────────────┘
│  ┌───────────────────┐   │   HTTP fetch (doPost)
│  │ doGet() → HTML    │   │
│  │ doPost() → API    │   │
│  └────────┬──────────┘   │
│           │              │
│  ┌────────▼──────────┐   │
│  │  Google Sheets     │   │
│  │  (Database)        │   │
│  ├───────────────────┤   │
│  │  Google Drive      │   │
│  │  (File Storage)    │   │
│  └───────────────────┘   │
└─────────────────────────┘
```

### Dual Deployment

| Platform | Mode | URL | Komunikasi Backend |
|----------|------|-----|-------------------|
| **Google Apps Script** | Single HTML file (inline CSS/JS) | URL GAS tetap (tidak berubah) | `google.script.run` (native) |
| **Vercel** | SPA multi-file (code-split) | URL Vercel | HTTP `fetch` via `doPost()` |

---

## 🛠️ Tech Stack

| Layer | Teknologi |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite 8 |
| **Styling** | TailwindCSS 3.4 |
| **Form** | React Hook Form + Zod validation |
| **UI Components** | Radix UI (Dialog, Select, Toast, Label) |
| **PDF Generation** | jsPDF + jspdf-autotable |
| **Backend** | Google Apps Script (JavaScript) |
| **Database** | Google Sheets |
| **File Storage** | Google Drive |
| **CI/CD** | GitHub Actions (→ GAS) + Vercel (auto-deploy) |
| **CLI Tools** | clasp (Google Apps Script CLI) |

---

## 📁 Struktur Proyek

```
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD: auto-deploy ke GAS
├── backend/
│   ├── .clasp.json             # Konfigurasi clasp (script ID)
│   ├── appsscript.json         # Manifest GAS
│   ├── Code.js                 # Backend: doGet, doPost, CRUD, dll.
│   └── index.html              # [Generated] Build output single-file
├── src/
│   ├── assets/                 # Gambar (logo, background, lab)
│   ├── components/
│   │   ├── ui/                 # Reusable UI components (Radix-based)
│   │   └── MonthlyReportGenerator.tsx
│   ├── hooks/
│   │   └── use-toast.ts
│   ├── lib/
│   │   ├── gas.ts              # Bridge: GAS / Vercel / Dev auto-detect
│   │   └── utils.ts
│   ├── pages/
│   │   ├── FormPeminjaman.tsx  # Halaman publik: form peminjaman
│   │   ├── Login.tsx           # Halaman login petugas
│   │   └── AdminDashboard.tsx  # Dashboard admin (protected)
│   ├── App.tsx                 # Router utama (HashRouter)
│   └── main.tsx                # Entry point
├── vercel.json                 # Konfigurasi Vercel (SPA rewrites)
├── vite.config.ts              # Dual-mode build (GAS / Vercel)
├── tailwind.config.js
├── tsconfig.json
├── .npmrc                      # legacy-peer-deps for CI
└── package.json
```

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [npm](https://www.npmjs.com/) v9+
- Akun Google dengan akses ke Google Apps Script & Sheets

### Development (Local)

```bash
# Clone repository
git clone https://github.com/RafidanAnwar/pinjamalatbk3.git
cd pinjamalatbk3

# Install dependencies
npm install --legacy-peer-deps

# Jalankan dev server (menggunakan mock data)
npm run dev
```

Buka `http://localhost:5173` — aplikasi berjalan dengan **mock data** sehingga tidak perlu koneksi ke GAS.

### Build

```bash
# Build untuk Google Apps Script (single HTML file)
npm run build:gas
# Output: backend/index.html

# Build untuk Vercel (SPA multi-file)
npm run build:vercel
# Output: dist/
```

### Deploy ke Google Apps Script (Manual)

```bash
cd backend
npx @google/clasp push --force
npx @google/clasp deploy -i <DEPLOYMENT_ID>
```

---

## ⚙️ CI/CD Setup

### GitHub Actions → Google Apps Script

Setiap push ke branch `main` akan otomatis men-deploy ke GAS tanpa mengubah URL yang sudah ada.

**Tambahkan 2 secrets di GitHub** ([Settings → Secrets → Actions](https://github.com/RafidanAnwar/pinjamalatbk3/settings/secrets/actions)):

| Secret | Isi |
|--------|-----|
| `CLASP_TOKEN` | Seluruh isi file `~/.clasprc.json` |
| `GAS_DEPLOYMENT_ID` | Deployment ID dari `clasp deployments` |

### Vercel

1. Import repo dari [Vercel Dashboard](https://vercel.com/new)
2. Konfigurasi:
   - **Build Command**: `npm run build:vercel`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install --legacy-peer-deps`

---

## 📊 Database Schema (Google Sheets)

### Sheet: `KatalogAlat`
| Kolom | Deskripsi |
|-------|-----------|
| `kode_alat` | Kode unik alat (PK) — contoh: HSM 01, SLM 05 |
| `nama_alat` | Nama peralatan |
| `kondisi` | Baik / Diperingatkan / Rusak |
| `ketersediaan` | Ready / Dipinjam / Kalibrasi / Maintenance / dll. |

### Sheet: `TransaksiPeminjaman`
| Kolom | Deskripsi |
|-------|-----------|
| `id_transaksi` | ID unik auto-generate (TRX-XXXXXXXX) |
| `nama_peminjam` | Nama peminjam |
| `email` | Email kontak |
| `lokasi` | Lokasi sampling |
| `tgl_pinjam` | Tanggal mulai pinjam |
| `tgl_kembali` | Tanggal rencana kembali |
| `drive_file_id_surat` | ID file surat tugas di Google Drive |
| `jenis_pengujian` | PNBP / DIPA / Praktik |
| `nomor_surat` | Nomor surat tugas |

### Sheet: `DetailPinjam`
| Kolom | Deskripsi |
|-------|-----------|
| `id_transaksi` | FK ke TransaksiPeminjaman |
| `kode_alat` | FK ke KatalogAlat |
| `jumlah` | Jumlah unit dipinjam |

### Sheet: `Users`
| Kolom | Deskripsi |
|-------|-----------|
| `id` | ID user |
| `username` | Username login |
| `password_hash` | SHA-256 hash password |
| `nama_petugas` | Nama lengkap petugas |

---

## 🔐 Keamanan

- **Autentikasi**: Password di-hash menggunakan SHA-256 di sisi server (GAS)
- **Session**: Token UUID disimpan di `localStorage`
- **File Upload**: Validasi tipe file (PDF/Image) di frontend
- **Race Condition**: `LockService` di GAS mencegah konflik saat peminjaman bersamaan
- **API Router**: Hanya fungsi yang di-whitelist yang bisa dipanggil via `doPost()`

---

## 📄 Lisensi

Hak Cipta © 2026 Balai K3. Dikembangkan untuk keperluan internal pengelolaan peralatan sampling.

---

<p align="center">
  <sub>Dibangun dengan ❤️ menggunakan React + Google Apps Script</sub>
</p>
