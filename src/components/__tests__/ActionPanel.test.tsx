import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import ActionPanel, { ActionItem } from '../ActionPanel';
import { FileText, Pencil, Trash2 } from 'lucide-react';

describe('ActionPanel Component', () => {
  const mockActions: ActionItem[] = [
    {
      label: 'Lihat Detail',
      description: 'Deskripsi detail aksi',
      icon: <FileText data-testid="icon-detail" />,
      onClick: vi.fn(),
    },
    {
      label: 'Edit Data',
      description: 'Deskripsi edit data',
      icon: <Pencil data-testid="icon-edit" />,
      onClick: vi.fn(),
    },
    {
      label: 'Aksi Nonaktif',
      icon: <FileText />,
      disabled: true,
      onClick: vi.fn(),
    },
    {
      label: 'Hapus Data',
      variant: 'destructive',
      icon: <Trash2 data-testid="icon-delete" />,
      onClick: vi.fn(),
    },
  ];

  it('tidak merender apapun saat isOpen = false', () => {
    const { container } = render(
      <ActionPanel
        isOpen={false}
        onClose={vi.fn()}
        title="TRX-123"
        actions={mockActions}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('merender title, subtitle, badge, dan meta informasi saat isOpen = true', () => {
    render(
      <ActionPanel
        isOpen={true}
        onClose={vi.fn()}
        title="TRX-12345"
        subtitle="John Doe"
        badge={{ text: 'Transaksi', variant: 'blue' }}
        meta={[
          { label: 'Lokasi', value: 'Laboratorium K3' },
          { label: 'Keperluan', value: 'Pengujian Debu' },
        ]}
        actions={mockActions}
      />
    );

    expect(screen.getByText('TRX-12345')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Transaksi')).toBeInTheDocument();
    expect(screen.getByText('Lokasi')).toBeInTheDocument();
    expect(screen.getByText('Laboratorium K3')).toBeInTheDocument();
    expect(screen.getByText('Keperluan')).toBeInTheDocument();
    expect(screen.getByText('Pengujian Debu')).toBeInTheDocument();
  });

  it('merender daftar aksi dan memanggil onClick saat salah satu aksi diklik', async () => {
    const user = userEvent.setup();
    render(
      <ActionPanel
        isOpen={true}
        onClose={vi.fn()}
        title="TRX-12345"
        actions={mockActions}
      />
    );

    const detailBtn = screen.getByRole('button', { name: /Lihat Detail/i });
    expect(detailBtn).toBeInTheDocument();
    await user.click(detailBtn);

    expect(mockActions[0].onClick).toHaveBeenCalledTimes(1);
  });

  it('tidak memanggil onClick untuk aksi yang disabled', async () => {
    const user = userEvent.setup();
    render(
      <ActionPanel
        isOpen={true}
        onClose={vi.fn()}
        title="TRX-12345"
        actions={mockActions}
      />
    );

    const disabledBtn = screen.getByRole('button', { name: /Aksi Nonaktif/i });
    expect(disabledBtn).toBeDisabled();
    await user.click(disabledBtn);

    expect(mockActions[2].onClick).not.toHaveBeenCalled();
  });

  it('memanggil onClose saat tombol close silang atau tombol Tutup Panel diklik', async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    const { rerender } = render(
      <ActionPanel
        isOpen={true}
        onClose={handleClose}
        title="TRX-12345"
        actions={mockActions}
      />
    );

    // Klik tombol silang header
    const closeXBtn = screen.getByRole('button', { name: /Tutup silang/i });
    await user.click(closeXBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Klik tombol footer "Tutup Panel"
    const closeFooterBtn = screen.getByRole('button', { name: /Tutup Panel/i });
    await user.click(closeFooterBtn);
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('memanggil onClose saat tombol Escape ditekan', () => {
    const handleClose = vi.fn();
    render(
      <ActionPanel
        isOpen={true}
        onClose={handleClose}
        title="TRX-12345"
        actions={mockActions}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
