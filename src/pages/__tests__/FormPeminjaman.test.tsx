import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import FormPeminjaman from '../FormPeminjaman';
import * as gasModule from '@/lib/gas';

vi.mock('@/assets/background.png', () => ({ default: 'mock-bg.png' }));
vi.mock('@/assets/logo.png', () => ({ default: 'mock-logo.png' }));
vi.mock('@/assets/lab.png', () => ({ default: 'mock-lab.png' }));

const renderForm = () => {
  return render(
    <MemoryRouter>
      <FormPeminjaman />
    </MemoryRouter>
  );
};

describe('FormPeminjaman — Komponen & Alur Interaksi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('harus merender judul form dan informasi sidebar', async () => {
    renderForm();
    expect(screen.getByText(/Sistem Peminjaman/i)).toBeInTheDocument();
    expect(screen.getByText(/Form Peminjaman Alat/i)).toBeInTheDocument();
  });

  it('harus menampilkan katalog alat status Ready pada dropdown setelah selesai loading', async () => {
    renderForm();

    await waitFor(() => {
      expect(screen.queryByText(/memuat daftar peralatan/i)).not.toBeInTheDocument();
    });

    const selectOptions = screen.getAllByRole('option');
    // AL-001 (Ready) dan AL-002 (Ready) harus ada di dropdown
    const optionTexts = selectOptions.map(opt => opt.textContent);
    expect(optionTexts.some(txt => txt?.includes('AL-001'))).toBe(true);
    expect(optionTexts.some(txt => txt?.includes('AL-002'))).toBe(true);
    // AL-003 (Dipinjam) tidak boleh ada
    expect(optionTexts.some(txt => txt?.includes('AL-003'))).toBe(false);
  });

  it('harus menampilkan pesan error dan tombol Coba Lagi jika fetch katalog gagal', async () => {
    vi.spyOn(gasModule, 'runServerFunction').mockRejectedValue(
      new Error('Timeout dari GAS server')
    );

    renderForm();

    await waitFor(() => {
      expect(screen.getByText(/Gagal memuat daftar peralatan/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Coba Lagi/i })).toBeInTheDocument();
    }, { timeout: 12000 });
  }, 15000);

  it('harus membuka dialog Login Petugas saat tombol Login diklik', async () => {
    const user = userEvent.setup();
    renderForm();

    const loginButton = screen.getByRole('button', { name: /Login Petugas/i });
    await user.click(loginButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/admin_balai/i)).toBeInTheDocument();
  });

  it('harus dapat menambah baris alat baru dengan tombol "Tambah Alat"', async () => {
    const user = userEvent.setup();
    renderForm();

    await waitFor(() => {
      expect(screen.queryByText(/memuat daftar peralatan/i)).not.toBeInTheDocument();
    });

    const tambahAlatBtn = screen.getByRole('button', { name: /Tambah Alat/i });
    await user.click(tambahAlatBtn);

    const comboboxes = screen.getAllByRole('combobox');
    // Minimal ada 2 combobox untuk kode alat (ditambah 1 jenis pengujian)
    expect(comboboxes.length).toBeGreaterThanOrEqual(3);
  });
});
