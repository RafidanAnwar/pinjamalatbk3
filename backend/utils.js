/**
 * Helper & utility murni untuk backend GAS / Node.js
 * Fungsi-fungsi di sini bebas dari dependency SpreadsheetApp / LockService
 * sehingga 100% testable di Node.js / Vitest.
 */

/**
 * Generate ID Transaksi acak
 * @returns {string} format: "TRX-XXXXXXXX"
 */
function generateIdTransaksi() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomPart = '';
  for (let k = 0; k < 8; k++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return 'TRX-' + randomPart;
}

/**
 * Validasi data peminjaman sebelum insert ke Sheets
 * @param {object} dataPeminjaman
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateDataPeminjaman(dataPeminjaman) {
  const errors = [];
  if (!dataPeminjaman || typeof dataPeminjaman !== 'object') {
    return { valid: false, errors: ['Data peminjaman tidak valid'] };
  }

  if (!dataPeminjaman.nama_peminjam || !dataPeminjaman.nama_peminjam.trim()) {
    errors.push('nama_peminjam wajib diisi');
  }
  if (!dataPeminjaman.email || !dataPeminjaman.email.includes('@')) {
    errors.push('email tidak valid');
  }
  if (!dataPeminjaman.lokasi || !dataPeminjaman.lokasi.trim()) {
    errors.push('lokasi wajib diisi');
  }
  if (!dataPeminjaman.tgl_pinjam) {
    errors.push('tgl_pinjam wajib diisi');
  }
  if (!dataPeminjaman.tgl_kembali) {
    errors.push('tgl_kembali wajib diisi');
  }
  if (dataPeminjaman.tgl_pinjam && dataPeminjaman.tgl_kembali) {
    if (new Date(dataPeminjaman.tgl_kembali) < new Date(dataPeminjaman.tgl_pinjam)) {
      errors.push('tgl_kembali tidak boleh sebelum tgl_pinjam');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validasi detail peminjaman
 * @param {Array<{kode_alat: string, jumlah: number}>} details
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateDetailPinjam(details) {
  const errors = [];
  if (!Array.isArray(details) || details.length === 0) {
    errors.push('Minimal 1 alat harus dipilih');
    return { valid: false, errors };
  }

  details.forEach((item, idx) => {
    if (!item.kode_alat || !item.kode_alat.trim()) {
      errors.push(`Baris ${idx + 1}: kode_alat wajib diisi`);
    }
    if (!item.jumlah || item.jumlah < 1) {
      errors.push(`Baris ${idx + 1}: jumlah minimal 1`);
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Parse baris data dari Sheets ke object KatalogAlat
 * @param {any[][]} rows - data dari sheetKatalog.getDataRange().getValues()
 * @returns {Array<{kode_alat: string, nama: string, kondisi: string, ketersediaan: string}>}
 */
function parseKatalogRows(rows) {
  if (!Array.isArray(rows) || rows.length <= 1) return [];
  return rows.slice(1).map(row => ({
    kode_alat: row[0],
    nama: row[1],
    kondisi: row[2],
    ketersediaan: row[3],
  })).filter(a => a.kode_alat);
}

/**
 * Parse baris data dari Sheets ke object TransaksiPeminjaman
 * @param {any[][]} rows - data dari sheetTransaksi.getDataRange().getValues()
 * @returns {Array<object>}
 */
function parseTransaksiRows(rows) {
  if (!Array.isArray(rows) || rows.length <= 1) return [];
  return rows.slice(1).map(row => ({
    id_transaksi: row[0],
    nama_peminjam: row[1],
    email: row[2],
    lokasi: row[3],
    tgl_pinjam: row[4],
    tgl_kembali: row[5],
    drive_file_id_surat: row[6],
    jenis_pengujian: row[7],
    nomor_surat: row[8],
  })).filter(t => t.id_transaksi);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateIdTransaksi,
    validateDataPeminjaman,
    validateDetailPinjam,
    parseKatalogRows,
    parseTransaksiRows,
  };
}
