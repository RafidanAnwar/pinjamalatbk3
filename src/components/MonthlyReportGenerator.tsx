import React, { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { runServerFunction } from '@/lib/gas';
import { toast } from '@/hooks/use-toast';
import {
  Transaction,
  MONTH_NAMES,
  aggregateReportData
} from '@/lib/reportUtils';

export type { Transaction };

/**
 * Helper untuk mengagregasi data dan mengenerate PDF Laporan Bulanan Murni
 */
export const generateMonthlyReport = (
  transactions: Transaction[], 
  selectedMonth: number, 
  selectedYear: number
) => {
  const {
    tabel1Data,
    totalSeluruhTim,
    tabel2Data,
    tabel3Data
  } = aggregateReportData(transactions, selectedMonth, selectedYear);

  // 3. GENERATE PDF DENGAN DESAIN DAN ALIGNMENT RESMi
  const doc = new jsPDF();
  const namaBulan = MONTH_NAMES[selectedMonth - 1] || '';
  let currentY = 20;
  
  // Set Font Default dan Header Judul Laporan
  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  doc.text('Pelayanan Peminjaman dan Pengembalian Peralatan Sampling', 105, currentY, { align: 'center' });
  currentY += 12;

  // Set Pengantar Paragraf
  doc.setFont('times', 'normal');
  doc.setFontSize(11);
  const textPengantar = `Selama periode pelayanan Bulan ${namaBulan} ${selectedYear}, telah dilakukan pelayanan peminjaman dan pengembalian peralatan sampling dengan rincian sebagai berikut:`;
  const splitPengantar = doc.splitTextToSize(textPengantar, 180);
  doc.text(splitPengantar, 14, currentY);
  currentY += (splitPengantar.length * 6);

  // Render Tabel 1 (~50% Lebar, Posisi Di Tengah)
  autoTable(doc, {
    startY: currentY,
    theme: 'plain',
    styles: { font: 'times', lineWidth: 0.1, textColor: [0, 0, 0], fontSize: 11 },
    headStyles: { fontStyle: 'bold', halign: 'center' },
    margin: { left: 55 },
    tableWidth: 100, // Fixed width agar terlihat proporsional di tengah
    head: [['No', 'Jenis Pengujian', 'Jumlah Tim']],
    body: tabel1Data,
    foot: [
      [
        { content: 'Total Tim', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold' } }, 
        { content: totalSeluruhTim.toString(), styles: { fontStyle: 'bold' } }
      ]
    ],
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      2: { halign: 'center', cellWidth: 25 },
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 12;
  
  // Teks Pengantar Tengah
  doc.setFont('times', 'italic');
  doc.text('(Form peminjaman dan pengembalian terlampir)', 105, currentY, { align: 'center' });
  currentY += 10;

  // Render Tabel 2 (100% dari batas margin standar)
  autoTable(doc, {
    startY: currentY,
    theme: 'plain',
    styles: { font: 'times', lineWidth: 0.1, textColor: [0, 0, 0], fontSize: 11 },
    headStyles: { fontStyle: 'bold', halign: 'center' },
    margin: { left: 14, right: 14 },
    head: [['No', 'Uraian Kegiatan', 'Jumlah']],
    body: tabel2Data,
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 },
      1: { cellWidth: 'auto' },
      2: { halign: 'center', cellWidth: 30 }
    }
  });
  
  currentY = (doc as any).lastAutoTable.finalY + 15;

  // Render Tabel 3 (~70% Lebar, Posisi Di Tengah)
  autoTable(doc, {
    startY: currentY,
    theme: 'plain',
    styles: { font: 'times', lineWidth: 0.1, textColor: [0, 0, 0], fontSize: 11 },
    headStyles: { fontStyle: 'bold', halign: 'center' },
    margin: { left: 35 },
    tableWidth: 140, // Format sekitar 70% width
    head: [
      [{ content: 'Jenis Alat Sampling Yang Sering Dipinjam', colSpan: 3, styles: { halign: 'center' } }],
      ['No', 'Nama Alat', 'Jumlah Dipinjam']
    ],
    body: tabel3Data,
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 },
      2: { halign: 'center', cellWidth: 40 }
    }
  });

  // Action Unduh/Save
  doc.save(`Laporan_Peminjaman_${namaBulan}_${selectedYear}.pdf`);
};


// ======= KOMPONEN UI ======= //

export interface MonthlyReportGeneratorProps {
  transactions?: Transaction[]; // Optional, kept for compatibility
}

export default function MonthlyReportGenerator({ transactions = [] }: MonthlyReportGeneratorProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const res = await runServerFunction('getLaporanPeminjamanDetailed');
      if (res.success) {
        generateMonthlyReport(res.data, selectedMonth, selectedYear);
        toast({ title: 'Berhasil', description: 'Laporan PDF dengan data terbaru berhasil diunduh.' });
      } else {
        toast({ title: 'Gagal', description: res.error || 'Gagal menyinkronkan data terbaru.', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Gagal', description: err.message || 'Terjadi kesalahan sistem.', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-6 bg-white border border-slate-200 shadow-sm rounded-xl max-w-xl mx-auto mt-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-slate-800">Rekapitulasi Bulanan</h3>
        <p className="text-sm text-slate-500 mt-1">Unduh laporan resmi PDF berdasarkan data peminjaman peralatan.</p>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-5 mb-8">
        <div className="flex-1 space-y-2">
          <label className="text-sm font-semibold text-slate-700">Periode Bulan</label>
          <div className="relative">
             <select 
               value={selectedMonth} 
               onChange={e => setSelectedMonth(Number(e.target.value))}
               className="w-full h-11 px-4 appearance-none rounded-lg border border-slate-300 bg-slate-50 text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow outline-none cursor-pointer"
             >
               {MONTH_NAMES.map((bulan, idx) => (
                 <option key={idx + 1} value={idx + 1}>{bulan}</option>
               ))}
             </select>
             <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
             </div>
          </div>
        </div>
        
        <div className="flex-1 space-y-2">
          <label className="text-sm font-semibold text-slate-700">Tahun</label>
          <input 
            type="number" 
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="w-full h-11 px-4 rounded-lg border border-slate-300 bg-slate-50 text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow outline-none"
            placeholder="YYYY"
          />
        </div>
      </div>

      <button 
        onClick={handleDownload}
        disabled={isGenerating}
        className="w-full relative overflow-hidden bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-75 disabled:cursor-wait"
      >
        {isGenerating ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Menyinkronkan & Mengunduh...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5 mr-2 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            <span>Unduh Laporan PDF</span>
          </>
        )}
      </button>
    </div>
  );
}
