import { useState, useEffect } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { LogOut, PackageSearch, RefreshCcw, ChevronLeft, ChevronRight, Trash2, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { runServerFunction } from '@/lib/gas';
import { toast } from '@/hooks/use-toast';
import MonthlyReportGenerator, { Transaction } from '@/components/MonthlyReportGenerator';

import { alatSchema, AlatFormValues } from '@/lib/schemas';

interface Alat {
  kode_alat: string;
  nama: string;
  kondisi: string;
  ketersediaan: string;
}

interface Transaksi {
  id_transaksi: string;
  nama_peminjam: string;
  lokasi: string;
  tgl_pinjam: string;
  tgl_kembali: string;
  drive_file_id_surat: string;
  jenis_pengujian?: string;
  nomor_surat?: string;
}

interface DetailPinjamItem {
  kode_alat: string;
  nama: string;
  kondisi: string;
  jumlah: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'transaksi' | 'katalog' | 'laporan'>('transaksi');
  const [loading, setLoading] = useState(false);
  const [transaksiList, setTransaksiList] = useState<Transaksi[]>([]);
  const [katalogList, setKatalogList] = useState<Alat[]>([]);
  const [laporanList, setLaporanList] = useState<Transaction[]>([]);

  // Filter States
  const [searchTransaksi, setSearchTransaksi] = useState('');
  const [searchKatalog, setSearchKatalog] = useState('');
  const [filterKetersediaan, setFilterKetersediaan] = useState('Semua');

  // Pagination States
  const [currentPageTransaksi, setCurrentPageTransaksi] = useState(1);
  const itemsPerPageTransaksi = 10;

  const [currentPageKatalog, setCurrentPageKatalog] = useState(1);
  const itemsPerPageKatalog = 10;

  useEffect(() => { setCurrentPageTransaksi(1); }, [searchTransaksi]);
  useEffect(() => { setCurrentPageKatalog(1); }, [searchKatalog, filterKetersediaan]);

  // State Modal Detail Peminjaman
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTrxId, setSelectedTrxId] = useState('');
  const [detailAlatList, setDetailAlatList] = useState<DetailPinjamItem[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const openDetailTransaksi = async (id_transaksi: string) => {
    setSelectedTrxId(id_transaksi);
    setIsDetailModalOpen(true);
    setLoadingDetail(true);
    setDetailAlatList([]);
    try {
      const res = await runServerFunction('getDetailTransaksi', id_transaksi);
      if (res.success) {
        setDetailAlatList(res.data || []);
      } else {
        toast({ title: 'Gagal Memuat Detail', description: res.error, variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoadingDetail(false);
    }
  };

  // State Hapus Transaksi
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletingTrxId, setDeletingTrxId] = useState('');
  const [isDeletingTrx, setIsDeletingTrx] = useState(false);

  const handleDeleteTransaksi = async () => {
    setIsDeletingTrx(true);
    try {
      const res = await runServerFunction('deleteTransaksi', deletingTrxId);
      if (res.success) {
        toast({ title: 'Berhasil Dihapus', description: res.message });
        setIsDeleteConfirmOpen(false);
        loadData();
      } else {
        throw new Error(res.error);
      }
    } catch (e: any) {
      toast({ title: 'Gagal Hapus', description: e.message, variant: 'destructive' });
    } finally {
      setIsDeletingTrx(false);
    }
  };

  // State Edit Detail Pinjaman
  const [isEditDetailOpen, setIsEditDetailOpen] = useState(false);
  const [editingTrx, setEditingTrx] = useState<Transaksi | null>(null);
  const [editDetailList, setEditDetailList] = useState<{ kode_alat: string; jumlah: number }[]>([]);
  const [isLoadingEditDetail, setIsLoadingEditDetail] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const openEditDetail = async (trx: Transaksi) => {
    setEditingTrx(trx);
    setIsEditDetailOpen(true);
    setIsLoadingEditDetail(true);
    setEditDetailList([]);
    try {
      const res = await runServerFunction('getDetailTransaksi', trx.id_transaksi);
      if (res.success) {
        setEditDetailList((res.data || []).map((d: any) => ({
          kode_alat: d.kode_alat,
          jumlah: d.jumlah || 1
        })));
      } else {
        throw new Error(res.error);
      }
    } catch (e: any) {
      toast({ title: 'Gagal memuat detail', description: e.message, variant: 'destructive' });
    } finally {
      setIsLoadingEditDetail(false);
    }
  };

  const handleSaveEditDetail = async () => {
    if (!editingTrx) return;
    if (editDetailList.length === 0) {
      toast({ title: 'Validasi', description: 'Minimal 1 alat harus ada dalam peminjaman.', variant: 'destructive' });
      return;
    }
    const hasEmptyAlat = editDetailList.some(item => !item.kode_alat);
    if (hasEmptyAlat) {
      toast({ title: 'Validasi', description: 'Silakan pilih alat untuk semua baris.', variant: 'destructive' });
      return;
    }

    const namaPetugas = localStorage.getItem('auth_user') || 'admin';
    setIsSubmittingEdit(true);
    try {
      const res = await runServerFunction(
        'editDetailPinjam',
        editingTrx.id_transaksi,
        editDetailList,
        namaPetugas
      );
      if (res.success) {
        toast({ title: 'Berhasil', description: res.message });
        setIsEditDetailOpen(false);
        loadData();
      } else {
        throw new Error(res.error);
      }
    } catch (e: any) {
      toast({ title: 'Gagal Menyimpan', description: e.message, variant: 'destructive' });
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // State Modal Alat
  const [isAlatModalOpen, setIsAlatModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [isSubmittingAlat, setIsSubmittingAlat] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AlatFormValues>({
    resolver: zodResolver(alatSchema),
    defaultValues: { kode_alat: '', nama: '', kondisi: 'Baik', ketersediaan: 'Ready' }
  });

  const openAddAlat = () => {
    setModalMode('add');
    reset({ kode_alat: '', nama: '', kondisi: 'Baik', ketersediaan: 'Ready' });
    setIsAlatModalOpen(true);
  };

  const openEditAlat = (alat: Alat) => {
    setModalMode('edit');
    reset({
      kode_alat: alat.kode_alat,
      nama: alat.nama,
      kondisi: alat.kondisi as any,
      ketersediaan: alat.ketersediaan as any
    });
    setIsAlatModalOpen(true);
  };

  const onSubmitAlat = async (data: AlatFormValues) => {
    setIsSubmittingAlat(true);
    try {
      const funcName = modalMode === 'add' ? 'addAlat' : 'editAlat';
      const res = await runServerFunction(funcName, data);
      if (res.success) {
        toast({ title: 'Berhasil', description: res.message });
        setIsAlatModalOpen(false);
        loadData();
      } else {
        throw new Error(res.error);
      }
    } catch (e: any) {
      toast({ title: 'Gagal Menyimpan', description: e.message, variant: 'destructive' });
    } finally {
      setIsSubmittingAlat(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'transaksi') {
        const [resTrx, resKat] = await Promise.all([
          runServerFunction('getPeminjamanList'),
          runServerFunction('getKatalogAlat')
        ]);
        if (resTrx.success) setTransaksiList(resTrx.data || []);
        else throw new Error(resTrx.error);
        if (resKat.success) setKatalogList(resKat.data || []);
      } else if (activeTab === 'katalog') {
        const res = await runServerFunction('getKatalogAlat');
        if (res.success) setKatalogList(res.data || []);
        else throw new Error(res.error);
      } else if (activeTab === 'laporan') {
        const res = await runServerFunction('getLaporanPeminjamanDetailed');
        if (res.success) setLaporanList(res.data || []);
        else throw new Error(res.error);
      }
    } catch (e: any) {
      toast({ title: 'Gagal memuat data', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check auth
    if (!localStorage.getItem('auth_token')) {
      navigate('/login');
      return;
    }
    loadData();
  }, [activeTab]);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    navigate('/');
  };

  const refreshData = () => {
    loadData();
  };

  // Computed / Filtered Data
  const filteredTransaksi = transaksiList.filter(trx =>
    trx.nama_peminjam.toLowerCase().includes(searchTransaksi.toLowerCase()) ||
    trx.id_transaksi.toLowerCase().includes(searchTransaksi.toLowerCase()) ||
    trx.lokasi.toLowerCase().includes(searchTransaksi.toLowerCase())
  );

  const filteredKatalog = katalogList.filter(alat => {
    const matchesSearch = alat.nama.toLowerCase().includes(searchKatalog.toLowerCase()) || alat.kode_alat.toLowerCase().includes(searchKatalog.toLowerCase());
    const matchesFilter = filterKetersediaan === 'Semua' || alat.ketersediaan === filterKetersediaan;
    return matchesSearch && matchesFilter;
  });

  // Pagination Logic
  const totalPagesTransaksi = Math.ceil(filteredTransaksi.length / itemsPerPageTransaksi) || 1;
  const currentTransaksi = filteredTransaksi.slice(
    (currentPageTransaksi - 1) * itemsPerPageTransaksi,
    currentPageTransaksi * itemsPerPageTransaksi
  );

  const totalPagesKatalog = Math.ceil(filteredKatalog.length / itemsPerPageKatalog) || 1;
  const currentKatalog = filteredKatalog.slice(
    (currentPageKatalog - 1) * itemsPerPageKatalog,
    currentPageKatalog * itemsPerPageKatalog
  );

  // Stats
  const totalTransaksi = transaksiList.length;
  const totalAlat = katalogList.length;
  const alatReady = katalogList.filter(a => a.ketersediaan === 'Ready').length;
  const alatDipinjam = katalogList.filter(a => a.ketersediaan === 'Dipinjam').length;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl text-slate-800">
            <PackageSearch className="text-blue-600 h-6 w-6" />
            Admin Panel
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={refreshData} disabled={loading}>
              <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Segarkan
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-600 hover:text-red-600 hover:bg-red-50">
              <LogOut className="h-4 w-4 mr-2" />
              Keluar
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-max mb-8 border border-slate-200">
          <button
            onClick={() => setActiveTab('transaksi')}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'transaksi' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            Data Peminjaman
          </button>
          <button
            onClick={() => setActiveTab('katalog')}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'katalog' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            Katalog Alat
          </button>
          <button
            onClick={() => setActiveTab('laporan')}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'laporan' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            Laporan Bulanan
          </button>
        </div>

        {activeTab === 'transaksi' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="border-slate-200 shadow-sm border-l-4 border-l-blue-500">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><PackageSearch size={24} /></div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Total Peminjaman</p>
                    <p className="text-2xl font-bold text-slate-800">{totalTransaksi}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-sm border-slate-200">
              <CardHeader className="bg-white border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <CardTitle className="text-lg">Riwayat & Status Transaksi</CardTitle>
                <div className="w-full sm:w-72">
                  <Input
                    placeholder="Cari ID, Nama, atau Lokasi..."
                    value={searchTransaksi}
                    onChange={e => setSearchTransaksi(e.target.value)}
                    className="bg-slate-50"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                      <tr>
                        <th className="px-6 py-4">ID Transaksi</th>
                        <th className="px-6 py-4">Peminjam</th>
                        <th className="px-6 py-4">Instansi/Lokasi</th>
                        <th className="px-6 py-4">Keperluan</th>
                        <th className="px-6 py-4">Periode</th>
                        <th className="px-6 py-4 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loading ? (
                        <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Memuat data...</td></tr>
                      ) : filteredTransaksi.length === 0 ? (
                        <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Belum ada transaksi peminjaman.</td></tr>
                      ) : (
                        currentTransaksi.map(trx => (
                          <tr key={trx.id_transaksi} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-blue-600">{trx.id_transaksi}</td>
                            <td className="px-6 py-4">{trx.nama_peminjam}</td>
                            <td className="px-6 py-4">{trx.lokasi}</td>
                            <td className="px-6 py-4">
                              <div className="font-medium">{trx.jenis_pengujian || '-'}</div>
                              <div className="text-xs text-slate-500">{trx.nomor_surat || '-'}</div>
                            </td>
                            <td className="px-6 py-4">{new Date(trx.tgl_pinjam).toLocaleDateString()} - {new Date(trx.tgl_kembali).toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex justify-center gap-2 flex-wrap">
                                <Button variant="outline" size="sm" className="h-8 text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => openDetailTransaksi(trx.id_transaksi)}>
                                  Detail Alat
                                </Button>
                                <Button variant="outline" size="sm" className="h-8 text-orange-600 border-orange-200 hover:bg-orange-50" onClick={() => openEditDetail(trx)}>
                                  Edit Alat
                                </Button>
                                {trx.drive_file_id_surat && trx.drive_file_id_surat !== 'null' ? (
                                  <a href={`https://drive.google.com/file/d/${trx.drive_file_id_surat}/view`} target="_blank" rel="noreferrer" className="inline-flex items-center px-3 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded-md text-xs font-medium border border-green-200 transition-colors h-8">
                                    Lihat Surat
                                  </a>
                                ) : (
                                  <span className="inline-flex items-center px-3 py-1 text-xs text-slate-400 bg-slate-50 border border-slate-100 rounded-md h-8">Tidak ada file</span>
                                )}
                                <Button variant="outline" size="sm" className="h-8 text-red-600 border-red-200 hover:bg-red-50" onClick={() => { setDeletingTrxId(trx.id_transaksi); setIsDeleteConfirmOpen(true); }}>
                                  Hapus
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Paginasi Transaksi */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-lg">
                  <span className="text-sm text-slate-500">
                    Menampilkan {filteredTransaksi.length > 0 ? (currentPageTransaksi - 1) * itemsPerPageTransaksi + 1 : 0} - {Math.min(currentPageTransaksi * itemsPerPageTransaksi, filteredTransaksi.length)} dari {filteredTransaksi.length} data
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline" size="sm"
                      disabled={currentPageTransaksi === 1}
                      onClick={() => setCurrentPageTransaksi(prev => Math.max(prev - 1, 1))}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Sebelumnya
                    </Button>
                    <div className="flex items-center justify-center px-3 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-md">
                      {currentPageTransaksi} / {totalPagesTransaksi}
                    </div>
                    <Button
                      variant="outline" size="sm"
                      disabled={currentPageTransaksi === totalPagesTransaksi || totalPagesTransaksi === 0}
                      onClick={() => setCurrentPageTransaksi(prev => Math.min(prev + 1, totalPagesTransaksi))}
                    >
                      Berikutnya
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'katalog' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-slate-200 shadow-sm border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <p className="text-sm text-slate-500 font-medium">Total Alat</p>
                  <p className="text-2xl font-bold text-slate-800">{totalAlat}</p>
                </CardContent>
              </Card>
              <Card className="border-slate-200 shadow-sm border-l-4 border-l-green-500">
                <CardContent className="p-4">
                  <p className="text-sm text-slate-500 font-medium">Alat Tersedia (Ready)</p>
                  <p className="text-2xl font-bold text-green-700">{alatReady}</p>
                </CardContent>
              </Card>
              <Card className="border-slate-200 shadow-sm border-l-4 border-l-purple-500">
                <CardContent className="p-4">
                  <p className="text-sm text-slate-500 font-medium">Alat Sedang Dipinjam</p>
                  <p className="text-2xl font-bold text-purple-700">{alatDipinjam}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-sm border-slate-200">
              <CardHeader className="bg-white border-b border-slate-100 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <CardTitle className="text-lg">Database Katalog Alat</CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm" onClick={openAddAlat}>
                      + Tambah Alat
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-2">
                  <Input
                    placeholder="Cari nama atau kode alat..."
                    value={searchKatalog}
                    onChange={e => setSearchKatalog(e.target.value)}
                    className="bg-slate-50 sm:max-w-xs"
                  />
                  <select
                    value={filterKetersediaan}
                    onChange={e => setFilterKetersediaan(e.target.value)}
                    className="flex h-10 items-center justify-between rounded-md border border-input bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring sm:max-w-[200px]"
                  >
                    <option value="Semua">Semua Ketersediaan</option>
                    <option value="Ready">Ready</option>
                    <option value="Dipinjam">Dipinjam</option>
                    <option value="Kalibrasi">Kalibrasi</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Pengusulan Lelang">Pengusulan Lelang</option>
                    <option value="Not Ready">Not Ready</option>
                    <option value="Dimusnahkan">Dimusnahkan</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                      <tr>
                        <th className="px-6 py-4">Kode Alat</th>
                        <th className="px-6 py-4">Nama Alat</th>
                        <th className="px-6 py-4 text-center">Kondisi</th>
                        <th className="px-6 py-4 text-center">Ketersediaan</th>
                        <th className="px-6 py-4 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loading ? (
                        <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Memuat data...</td></tr>
                      ) : filteredKatalog.length === 0 ? (
                        <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Tidak ada alat yang sesuai pencarian/filter.</td></tr>
                      ) : (
                        currentKatalog.map(item => (
                          <tr key={item.kode_alat} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-slate-900">{item.kode_alat}</td>
                            <td className="px-6 py-4 text-slate-600">{item.nama}</td>
                            <td className="px-6 py-4 text-center">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${item.kondisi === 'Baik' ? 'bg-green-50 text-green-700' :
                                item.kondisi === 'Diperingatkan' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'
                                }`}>
                                {item.kondisi}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${item.ketersediaan === 'Ready' ? 'bg-blue-50 text-blue-700' :
                                item.ketersediaan === 'Dipinjam' ? 'bg-purple-50 text-purple-700' : 'bg-slate-100 text-slate-600'
                                }`}>
                                {item.ketersediaan}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <Button variant="ghost" size="sm" className="text-blue-600 h-8" onClick={() => openEditAlat(item)}>Edit</Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Paginasi Katalog */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-lg">
                  <span className="text-sm text-slate-500">
                    Menampilkan {filteredKatalog.length > 0 ? (currentPageKatalog - 1) * itemsPerPageKatalog + 1 : 0} - {Math.min(currentPageKatalog * itemsPerPageKatalog, filteredKatalog.length)} dari {filteredKatalog.length} data
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline" size="sm"
                      disabled={currentPageKatalog === 1}
                      onClick={() => setCurrentPageKatalog(prev => Math.max(prev - 1, 1))}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Sebelumnya
                    </Button>
                    <div className="flex items-center justify-center px-3 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-md">
                      {currentPageKatalog} / {totalPagesKatalog}
                    </div>
                    <Button
                      variant="outline" size="sm"
                      disabled={currentPageKatalog === totalPagesKatalog || totalPagesKatalog === 0}
                      onClick={() => setCurrentPageKatalog(prev => Math.min(prev + 1, totalPagesKatalog))}
                    >
                      Berikutnya
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'laporan' && (
          <div className="space-y-6">

            {loading ? (
              <div className="p-8 text-center text-slate-500">Memuat data real dari server...</div>
            ) : (
              <MonthlyReportGenerator transactions={laporanList} />
            )}
          </div>
        )}
      </main>

      {/* Dialog Form Alat */}
      <Dialog open={isAlatModalOpen} onOpenChange={setIsAlatModalOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800">
              {modalMode === 'add' ? 'Tambah Alat Baru' : 'Edit Alat'}
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Masukkan detail spesifikasi alat ke dalam katalog.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmitAlat)} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-slate-700">Kode Alat</Label>
              <Input placeholder="AL-001..." {...register('kode_alat')} className={errors.kode_alat ? "border-red-500" : ""} />
              {errors.kode_alat && <p className="text-sm text-red-500">{errors.kode_alat.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">Nama Alat</Label>
              <Input placeholder="High Volume Air Sampler" {...register('nama')} className={errors.nama ? "border-red-500" : ""} />
              {errors.nama && <p className="text-sm text-red-500">{errors.nama.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700">Kondisi</Label>
                <select
                  {...register('kondisi')}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="Baik">Baik</option>
                  <option value="Diperingatkan">Diperingatkan</option>
                  <option value="Rusak">Rusak</option>
                </select>
                {errors.kondisi && <p className="text-sm text-red-500">{errors.kondisi.message}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700">Ketersediaan</Label>
                <select
                  {...register('ketersediaan')}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="Ready">Ready</option>
                  <option value="Dipinjam">Dipinjam</option>
                  <option value="Kalibrasi">Kalibrasi</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Pengusulan Lelang">Pengusulan Lelang</option>
                  <option value="Not Ready">Not Ready</option>
                  <option value="Dimusnahkan">Dimusnahkan</option>
                </select>
                {errors.ketersediaan && <p className="text-sm text-red-500">{errors.ketersediaan.message}</p>}
              </div>
            </div>

            <Button type="submit" disabled={isSubmittingAlat} className="w-full mt-2 h-11 bg-blue-600 hover:bg-blue-700 text-white shadow-md">
              {isSubmittingAlat ? 'Menyimpan...' : 'Simpan Data'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Detail Peminjaman */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-2xl bg-white max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800">
              Detail Peminjaman Alat
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              ID Transaksi: <span className="font-semibold text-slate-700">{selectedTrxId}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 mt-4 border rounded-md">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium sticky top-0">
                <tr>
                  <th className="px-4 py-3">Kode Alat</th>
                  <th className="px-4 py-3">Nama Alat</th>
                  <th className="px-4 py-3 text-center">Kondisi</th>
                  <th className="px-4 py-3 text-center">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingDetail ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Memuat detail alat...</td></tr>
                ) : detailAlatList.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Tidak ada data alat.</td></tr>
                ) : (
                  detailAlatList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">{item.kode_alat}</td>
                      <td className="px-4 py-3 text-slate-600">{item.nama}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${item.kondisi === 'Baik' ? 'bg-green-50 text-green-700' :
                          item.kondisi === 'Diperingatkan' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'
                          }`}>
                          {item.kondisi}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-medium">{item.jumlah}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="pt-4 flex justify-end">
             <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>Tutup</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Hapus Transaksi */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800">Hapus Transaksi?</DialogTitle>
            <DialogDescription className="text-slate-600">
              Transaksi <strong className="text-blue-600">{deletingTrxId}</strong> akan dihapus permanen.
              Semua alat dalam transaksi ini akan dikembalikan ke status <strong className="text-green-600">Ready</strong>.
              Tindakan ini tidak bisa dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleDeleteTransaksi} disabled={isDeletingTrx}>
              {isDeletingTrx ? 'Menghapus...' : 'Ya, Hapus Permanen'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Edit Detail Pinjaman */}
      <Dialog open={isEditDetailOpen} onOpenChange={setIsEditDetailOpen}>
        <DialogContent className="sm:max-w-2xl bg-white max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800">Edit Alat Dipinjam</DialogTitle>
            <DialogDescription className="text-slate-500">
              Transaksi: <strong className="text-slate-700">{editingTrx?.id_transaksi}</strong> · {editingTrx?.nama_peminjam}
              <br/>
              <span className="text-amber-600 text-xs font-medium block mt-1">
                ⚠ Alat lama akan direset ke Ready. Pastikan alat pengganti tersedia. Setiap perubahan dicatat di log audit.
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 space-y-3 py-2">
            {isLoadingEditDetail ? (
              <p className="text-center py-8 text-slate-500">Memuat data alat...</p>
            ) : (
              <>
                {editDetailList.map((item, idx) => (
                  <div key={idx} className="flex gap-3 items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <select
                      value={item.kode_alat}
                      onChange={e => {
                        const next = [...editDetailList];
                        next[idx] = { ...next[idx], kode_alat: e.target.value };
                        setEditDetailList(next);
                      }}
                      className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">-- Pilih Alat --</option>
                      {katalogList
                        .filter(a => a.ketersediaan === 'Ready' || a.kode_alat === item.kode_alat)
                        .map(a => (
                          <option key={a.kode_alat} value={a.kode_alat}>
                            {a.kode_alat} - {a.nama}
                            {a.ketersediaan !== 'Ready' ? ` (${a.ketersediaan})` : ''}
                          </option>
                        ))
                      }
                    </select>
                    <input
                      type="number" min={1}
                      value={item.jumlah}
                      onChange={e => {
                        const next = [...editDetailList];
                        next[idx] = { ...next[idx], jumlah: Number(e.target.value) };
                        setEditDetailList(next);
                      }}
                      className="w-20 h-9 rounded-md border border-input bg-background px-3 text-sm"
                    />
                    <Button
                      type="button" variant="ghost" size="icon"
                      className="text-red-500 hover:bg-red-50"
                      onClick={() => setEditDetailList(prev => prev.filter((_, i) => i !== idx))}
                      disabled={editDetailList.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button" variant="outline" size="sm"
                  className="w-full text-blue-600 border-blue-200 hover:bg-blue-50"
                  onClick={() => setEditDetailList(prev => [...prev, { kode_alat: '', jumlah: 1 }])}
                >
                  <Plus className="h-4 w-4 mr-1" /> Tambah Alat
                </Button>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsEditDetailOpen(false)}>Batal</Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700 text-white"
              onClick={handleSaveEditDetail}
              disabled={isSubmittingEdit || isLoadingEditDetail}
            >
              {isSubmittingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
