import { http, HttpResponse } from 'msw';
import { mockKatalogAlat, mockTransaksiList } from '../fixtures';

export const defaultHandlers = [
  http.post('/api/gas', async ({ request }) => {
    const body = (await request.json()) as { action: string; params: any[] };

    switch (body.action) {
      case 'getKatalogAlat':
        return HttpResponse.json({
          success: true,
          data: mockKatalogAlat,
        });

      case 'getPeminjamanList':
        return HttpResponse.json({
          success: true,
          data: mockTransaksiList,
        });

      case 'getDetailTransaksi':
        return HttpResponse.json({
          success: true,
          data: [
            {
              kode_alat: 'AL-001',
              nama: 'High Volume Air Sampler',
              kondisi: 'Baik',
              jumlah: 1,
            },
          ],
        });

      case 'submitPeminjaman':
      case 'submitPeminjamanLengkap':
        return HttpResponse.json({
          success: true,
          id_transaksi: 'TRX-TEST1234',
          message: 'Data Peminjaman berhasil disimpan',
        });

      case 'authenticatePetugas':
        if (body.params && body.params[0] === 'admin' && body.params[1] === 'password') {
          return HttpResponse.json({
            success: true,
            user: { username: 'admin', role: 'admin' },
            token: 'mock-jwt-token',
          });
        }
        return HttpResponse.json({
          success: false,
          error: 'Username atau password salah',
        });

      case 'addAlat':
        return HttpResponse.json({
          success: true,
          message: 'Alat berhasil ditambahkan',
        });

      case 'editAlat':
        return HttpResponse.json({
          success: true,
          message: 'Data alat berhasil diubah',
        });

      case 'deleteTransaksi':
        return HttpResponse.json({
          success: true,
          message: 'Transaksi berhasil dihapus dan status alat direset ke Ready.',
        });

      case 'editDetailPinjam':
        return HttpResponse.json({
          success: true,
          message: 'Detail pinjaman berhasil diperbarui dan perubahan dicatat.',
        });

      case 'getLaporanPeminjamanDetailed':
        return HttpResponse.json({
          success: true,
          data: [
            {
              id: 'TRX-ABCD1234-AL-001',
              id_transaksi: 'TRX-ABCD1234',
              tanggalPinjam: '2026-08-01',
              jenisPengujian: 'PNBP',
              namaAlat: 'High Volume Air Sampler',
              jumlahPinjam: 1,
              status: 'Dipinjam',
              kondisiKembali: null,
            },
          ],
        });

      default:
        return HttpResponse.json(
          { success: false, error: `Aksi tidak dikenal: ${body.action}` },
          { status: 400 }
        );
    }
  }),
];
