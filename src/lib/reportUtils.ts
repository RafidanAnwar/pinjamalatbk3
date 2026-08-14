/**
 * Struktur transaksi peminjaman untuk kebutuhan rekapitulasi laporan bulanan.
 */
export interface Transaction {
  /** ID unik lokal atau record */
  id: string;
  /** ID transaksi peminjaman (contoh: TRX-ABC12345) */
  id_transaksi?: string;
  /** Tanggal peminjaman dalam format YYYY-MM-DD */
  tanggalPinjam: string;
  /** Kategori jenis pengujian (PNBP / DIPA / Praktik) */
  jenisPengujian: string;
  /** Nama alat yang dipinjam */
  namaAlat: string;
  /** Jumlah unit alat yang dipinjam */
  jumlahPinjam: number;
  /** Status transaksi peminjaman */
  status: 'Selesai' | 'Dipinjam';
  /** Kondisi fisik alat saat dikembalikan (jika sudah selesai) */
  kondisiKembali: 'Baik' | 'Rusak' | 'Hilang' | 'Diperbaiki' | null;
}

/** Daftar nama bulan dalam Bahasa Indonesia untuk header laporan */
export const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Struktur hasil kalkulasi dan agregasi data laporan bulanan.
 */
export interface AggregatedReportData {
  /** Daftar transaksi yang sesuai dengan filter bulan dan tahun */
  filteredTransactions: Transaction[];
  /** Data Tabel 1: Rekapitulasi per Jenis Pengujian [No, Jenis Pengujian, Jumlah Transaksi] */
  tabel1Data: Array<[number, string, number]>;
  /** Total seluruh transaksi dari seluruh tim */
  totalSeluruhTim: number;
  /** Total permintaan unik peminjaman alat */
  totalPermintaan: number;
  /** Total unit alat yang dipinjam secara keseluruhan */
  totalUnit: number;
  /** Jumlah unit alat yang dikembalikan dalam kondisi baik */
  unitBaik: number;
  /** Jumlah unit alat yang dikembalikan dalam kondisi rusak */
  unitRusak: number;
  /** Jumlah unit alat yang dikembalikan dalam kondisi hilang/kurang */
  unitHilang: number;
  /** Jumlah unit alat yang diperbaiki setelah pengembalian */
  unitDiperbaiki: number;
  /** Data Tabel 2: Uraian Kegiatan Operasional [No, Deskripsi, Jumlah] */
  tabel2Data: Array<[number, string, number]>;
  /** Data Tabel 3: 10 Alat Paling Sering Dipinjam [No, Nama Alat, Frekuensi Unit] */
  tabel3Data: Array<[number, string, number]>;
}

/**
 * Fungsi murni (pure function) untuk memfilter dan mengagregasi data peminjaman bulanan.
 * Menghasilkan ringkasan untuk 3 tabel laporan resmi PDF Balai K3:
 * 1. Rekap Tim Pengujian (PNBP/DIPA/Praktik)
 * 2. Uraian Kegiatan (Total permintaan, kondisi pengembalian)
 * 3. Top 10 Alat Paling Banyak Dipinjam
 *
 * @param transactions - Daftar seluruh transaksi riwayat peminjaman
 * @param selectedMonth - Angka bulan (1 = Januari, 12 = Desember)
 * @param selectedYear - Tahun (contoh: 2026)
 * @returns Object AggregatedReportData yang siap dirender ke tabel PDF
 *
 * @example
 * const report = aggregateReportData(transaksiList, 8, 2026);
 * console.log(`Total permintaan: ${report.totalPermintaan}`);
 */
export function aggregateReportData(
  transactions: Transaction[],
  selectedMonth: number,
  selectedYear: number
): AggregatedReportData {

  // 1. FILTER DATA berdasarkan bulan dan tahun
  const filtered = transactions.filter(t => {
    if (!t.tanggalPinjam) return false;
    const d = new Date(t.tanggalPinjam);
    return (d.getMonth() + 1) === selectedMonth && d.getFullYear() === selectedYear;
  });

  // 2. AGREGASI DATA

  // -- Tabel 1: Rekap Tim berdasarkan Jenis Pengujian --
  const rekapTimMap = new Map<string, Set<string>>();
  filtered.forEach(t => {
    const jenis = t.jenisPengujian || 'Tidak Diketahui';
    if (!rekapTimMap.has(jenis)) {
      rekapTimMap.set(jenis, new Set());
    }
    rekapTimMap.get(jenis)!.add(t.id_transaksi || t.id);
  });

  const tabel1Data: Array<[number, string, number]> = [];
  let totalSeluruhTim = 0;
  let index1 = 1;
  rekapTimMap.forEach((idsSet, jenis) => {
    tabel1Data.push([index1++, jenis, idsSet.size]);
    totalSeluruhTim += idsSet.size;
  });

  // -- Tabel 2: Uraian Kegiatan --
  const totalPermintaan = new Set(filtered.map(t => t.id_transaksi || t.id)).size;

  let totalUnit = 0;
  let unitBaik = 0;
  let unitRusak = 0;
  let unitHilang = 0;
  let unitDiperbaiki = 0;

  filtered.forEach(t => {
    totalUnit += t.jumlahPinjam;
    if (t.kondisiKembali === 'Baik') unitBaik += t.jumlahPinjam;
    else if (t.kondisiKembali === 'Rusak') unitRusak += t.jumlahPinjam;
    else if (t.kondisiKembali === 'Hilang') unitHilang += t.jumlahPinjam;
    else if (t.kondisiKembali === 'Diperbaiki') unitDiperbaiki += t.jumlahPinjam;
  });

  const tabel2Data: Array<[number, string, number]> = [
    [1, 'Total permintaan peminjaman alat', totalPermintaan],
    [2, 'Total unit alat yang dipinjam', totalUnit],
    [3, 'Alat dikembalikan dalam kondisi baik dan lengkap', unitBaik],
    [4, 'Alat dikembalikan dalam kondisi rusak ringan/berat', unitRusak],
    [5, 'Alat dikembalikan dalam kondisi hilang/komponen kurang', unitHilang],
    [6, 'Alat yang diperbaiki setelah pengembalian', unitDiperbaiki],
  ];

  // -- Tabel 3: Alat Sering Dipinjam (Top 10) --
  const alatMap = new Map<string, number>();
  filtered.forEach(t => {
    const nama = t.namaAlat || 'Alat Tanpa Nama';
    alatMap.set(nama, (alatMap.get(nama) || 0) + t.jumlahPinjam);
  });

  const alatSorted = Array.from(alatMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const tabel3Data: Array<[number, string, number]> = alatSorted.map((item, idx) => [
    idx + 1,
    item[0],
    item[1],
  ]);

  return {
    filteredTransactions: filtered,
    tabel1Data,
    totalSeluruhTim,
    totalPermintaan,
    totalUnit,
    unitBaik,
    unitRusak,
    unitHilang,
    unitDiperbaiki,
    tabel2Data,
    tabel3Data,
  };
}
