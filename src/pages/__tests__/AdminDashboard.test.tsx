import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminDashboard from '../AdminDashboard';
import * as gasModule from '@/lib/gas';
import { mockTransaksiList, mockKatalogAlat } from '@/test/fixtures';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderDashboard = () => {
  localStorage.setItem('auth_token', 'mock-token-admin');
  return render(
    <MemoryRouter>
      <AdminDashboard />
    </MemoryRouter>
  );
};

describe('AdminDashboard — Autentikasi & Navigasi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockNavigate.mockClear();
    localStorage.clear();
  });

  it('harus me-redirect ke /login jika auth_token tidak ada di localStorage', () => {
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('harus merender dashboard jika auth_token ada', async () => {
    renderDashboard();
    expect(screen.getByText(/Admin Panel/i)).toBeInTheDocument();
  });

  it('harus melakukan logout saat tombol Keluar diklik', async () => {
    const user = userEvent.setup();
    renderDashboard();

    const logoutBtn = screen.getByRole('button', { name: /Keluar/i });
    await user.click(logoutBtn);

    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});

describe('AdminDashboard — Tab Transaksi & Fitur Aksi (Row-Click & ActionPanel)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockNavigate.mockClear();
    localStorage.clear();
    localStorage.setItem('auth_token', 'mock-token-admin');

    vi.spyOn(gasModule, 'runServerFunction').mockImplementation((funcName: string, ...args: any[]) => {
      if (funcName === 'getPeminjamanList') {
        return Promise.resolve({ success: true, data: mockTransaksiList });
      }
      if (funcName === 'getKatalogAlat') {
        return Promise.resolve({ success: true, data: mockKatalogAlat });
      }
      if (funcName === 'getDetailTransaksi') {
        return Promise.resolve({
          success: true,
          data: [{ kode_alat: 'AL-001', nama: 'High Volume Air Sampler', kondisi: 'Baik', jumlah: 1 }],
        });
      }
      if (funcName === 'deleteTransaksi') {
        return Promise.resolve({ success: true, message: 'Transaksi berhasil dihapus' });
      }
      if (funcName === 'editDetailPinjam') {
        return Promise.resolve({ success: true, message: 'Detail pinjaman berhasil diperbarui' });
      }
      return Promise.resolve({ success: true, data: [] });
    });
  });

  it('harus memuat dan menampilkan baris data transaksi peminjaman', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('TRX-ABCD1234')).toBeInTheDocument();
      expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
    });
  });

  it('harus membuka ActionPanel saat baris data transaksi diklik', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('TRX-ABCD1234')).toBeInTheDocument();
    });

    // Klik baris transaksi
    const rowItem = screen.getByText('TRX-ABCD1234');
    await user.click(rowItem);

    // Verifikasi ActionPanel terbuka
    expect(screen.getByText(/Pilihan Aksi/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Detail Peminjaman/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Edit Alat Dipinjam/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hapus Transaksi/i })).toBeInTheDocument();
  });

  it('harus membuka dialog Detail Peminjaman saat aksi Detail Peminjaman dipilih dari panel', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('TRX-ABCD1234')).toBeInTheDocument();
    });

    // Klik baris
    await user.click(screen.getByText('TRX-ABCD1234'));

    // Klik tombol aksi di ActionPanel
    const detailBtn = screen.getByRole('button', { name: /Detail Peminjaman/i });
    await user.click(detailBtn);

    expect(screen.getByText(/Detail Peminjaman Alat/i)).toBeInTheDocument();
  });

  it('harus membuka dialog konfirmasi Hapus saat aksi Hapus Transaksi dipilih dari panel', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('TRX-ABCD1234')).toBeInTheDocument();
    });

    // Klik baris
    await user.click(screen.getByText('TRX-ABCD1234'));

    // Klik Hapus Transaksi di panel
    const hapusBtn = screen.getByRole('button', { name: /Hapus Transaksi/i });
    await user.click(hapusBtn);

    expect(screen.getByText(/Hapus Transaksi\?/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ya, Hapus Permanen/i })).toBeInTheDocument();
  });

  it('harus memanggil deleteTransaksi dan menutup dialog saat konfirmasi hapus', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('TRX-ABCD1234')).toBeInTheDocument();
    });

    // Klik baris lalu pilih Hapus
    await user.click(screen.getByText('TRX-ABCD1234'));
    const hapusBtn = screen.getByRole('button', { name: /Hapus Transaksi/i });
    await user.click(hapusBtn);

    const konfirmasiBtn = screen.getByRole('button', { name: /Ya, Hapus Permanen/i });
    await user.click(konfirmasiBtn);

    await waitFor(() => {
      expect(gasModule.runServerFunction).toHaveBeenCalledWith('deleteTransaksi', 'TRX-ABCD1234');
    });
  });

  it('harus membuka modal Edit Alat Dipinjam saat aksi Edit dipilih dari panel', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('TRX-ABCD1234')).toBeInTheDocument();
    });

    // Klik baris lalu pilih Edit Alat Dipinjam
    await user.click(screen.getByText('TRX-ABCD1234'));
    const editAlatBtn = screen.getByRole('button', { name: /Edit Alat Dipinjam/i });
    await user.click(editAlatBtn);

    expect(screen.getByText(/Edit Alat Dipinjam/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Simpan Perubahan/i })).toBeInTheDocument();
  });

  it('harus membuka ActionPanel dan modal Edit Alat saat baris katalog diklik', async () => {
    const user = userEvent.setup();
    renderDashboard();

    // Pindah ke tab katalog
    const tabKatalog = screen.getByRole('button', { name: /Katalog Alat/i });
    await user.click(tabKatalog);

    await waitFor(() => {
      expect(screen.getByText('High Volume Air Sampler')).toBeInTheDocument();
    });

    // Klik baris alat
    await user.click(screen.getByText('High Volume Air Sampler'));

    // Cek ActionPanel terbuka untuk katalog
    const editDataBtn = screen.getByRole('button', { name: /Edit Data Alat/i });
    expect(editDataBtn).toBeInTheDocument();
    await user.click(editDataBtn);

    // Form Edit Alat terbuka
    expect(screen.getByText('Edit Alat')).toBeInTheDocument();
  });
});
