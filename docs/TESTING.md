# 🧪 Panduan Pengujian (Testing Guide)

Dokumen ini menjelaskan strategi pengujian, konfigurasi testing framework, dan panduan praktis menulis test case untuk sistem **Manajemen Peminjaman Alat K3**.

---

## 1. Alat dan Teknologi Pengujian

| Library / Tool | Versi | Peran & Kegunaan |
|---|---|---|
| **Vitest** | ^3.x | Test runner utama yang sangat cepat dan terintegrasi native dengan Vite. |
| **@testing-library/react** | ^16.x | Merender dan menguji interaksi user pada komponen React. |
| **@testing-library/jest-dom** | ^6.x | Custom matchers untuk asersi DOM (misal: `toBeInTheDocument()`). |
| **@testing-library/user-event** | ^14.x | Mensimulasikan klik tombol, ketikan input, dan interaksi pengguna nyata. |
| **MSW (Mock Service Worker)** | ^2.x | Mencegat dan mem-mock request HTTP `/api/gas` pada level network. |
| **jsdom** | ^26.x | Lingkungan DOM virtual di dalam Node.js. |

---

## 2. Perintah Testing

```bash
# 1. Menjalankan seluruh test suite sekali (Cocok untuk CI/CD)
npm run test

# 2. Menjalankan test dalam mode watch (Interaktif, otomatis re-run saat file diedit)
npm run test:watch

# 3. Menghasilkan laporan coverage kode
npm run test:coverage
```

Laporan coverage akan disimpan di folder `coverage/` dan otomatis di-ignore oleh git.

---

## 3. Struktur Direktori Pengujian

```
src/
├── test/
│   ├── setup.ts              # Konfigurasi global (jest-dom, matchMedia mock, MSW lifecycle)
│   ├── fixtures.ts           # Dataset dummy/palsu untuk testing (mock katalog, transaksi)
│   └── msw/
│       ├── handlers.ts       # Network handler untuk mem-mock endpoint /api/gas
│       └── server.ts         # Inisialisasi MSW server untuk lingkungan Node.js
├── lib/
│   └── __tests__/
│       ├── gas.test.ts       # Integration test untuk gas.ts bridge
│       ├── reportUtils.test.ts # Unit test kalkulasi laporan bulanan
│       └── schemas.test.ts   # Unit test validasi Zod
└── pages/
    └── __tests__/
        ├── FormPeminjaman.test.tsx # Component test Form Peminjaman
        └── AdminDashboard.test.tsx # Component test Dashboard Admin
backend/
└── __tests__/
    └── utils.test.js         # Unit test logika backend murni
```

---

## 4. Pola dan Cara Menulis Test Baru

### Kasus A: Unit Test Fungsi Murni (Pure Function)
Jika Anda membuat fungsi helper, parsing data, atau kalkulasi:

```typescript
import { describe, it, expect } from 'vitest';
import { fungsiKalkulasiSaya } from '../kalkulasi';

describe('fungsiKalkulasiSaya', () => {
  it('harus menghasilkan nilai yang benar jika input valid', () => {
    const hasil = fungsiKalkulasiSaya(10, 20);
    expect(hasil).toBe(30);
  });

  it('harus melempar error jika parameter negatif', () => {
    expect(() => fungsiKalkulasiSaya(-1, 5)).toThrow();
  });
});
```

---

### Kasus B: Unit Test Validasi Skema Zod
Jika Anda menambahkan field baru pada formulir peminjaman atau katalog alat:

```typescript
import { describe, it, expect } from 'vitest';
import { formPeminjamanSchema } from '../schemas';

describe('Validasi Form Peminjaman', () => {
  it('harus menolak form jika email tidak memiliki format @', () => {
    const dataInvalid = {
      nama_peminjam: 'Budi',
      email: 'budi-tanpa-domain',
      lokasi: 'Pabrik A',
      jenis_pengujian: 'PNBP',
      nomor_surat: 'ST/01/2026',
      tgl_pinjam: '2026-08-15',
      tgl_kembali: '2026-08-18',
      detail: [{ kode_alat: 'HSM 01', jumlah: 1 }]
    };

    const hasil = formPeminjamanSchema.safeParse(dataInvalid);
    expect(hasil.success).toBe(false);
  });
});
```

---

### Kasus C: Pengujian Komponen React dengan User Event
Jika Anda menguji interaksi antarmuka pengguna:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FormPeminjaman from '../FormPeminjaman';
import { HashRouter } from 'react-router-dom';

describe('Halaman FormPeminjaman', () => {
  it('menampilkan pesan validasi ketika tombol kirim diklik saat form kosong', async () => {
    const user = userEvent.setup();
    render(
      <HashRouter>
        <FormPeminjaman />
      </HashRouter>
    );

    const submitBtn = screen.getByRole('button', { name: /ajukan peminjaman/i });
    await user.click(submitBtn);

    expect(await screen.findByText(/nama minimal 3 karakter/i)).toBeInTheDocument();
  });
});
```

---

## 5. Mengapa Backend GAS Di-test Menggunakan MSW & Pure Functions?

Google Apps Script memiliki runtime khusus (`google.script.run`, `SpreadsheetApp`) yang tidak ada di Node.js.
Untuk memastikan test dapat berjalan cepat di CI/CD tanpa koneksi internet ke Google:

1. **MSW (Mock Service Worker)** digunakan untuk mem-mock response API `/api/gas` saat mode Vercel diuji.
2. **`backend/utils.js`** dipisahkan sebagai logika murni tanpa Google API agar dapat diuji 100% menggunakan runner Node.js.
