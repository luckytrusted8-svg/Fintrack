import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaksi } from '../db';
import { formatRupiah } from './format';

async function getMascotImageInfo(url: string): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const dims = await new Promise<{ width: number; height: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth || 391, height: img.naturalHeight || 261 });
      img.onerror = () => resolve({ width: 391, height: 261 });
      img.src = dataUrl;
    });

    return { dataUrl, ...dims };
  } catch {
    return null;
  }
}

function formatTanggalFormal(dateString: string): string {
  if (!dateString) return '-';
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    const bulanIndo = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${d} ${bulanIndo[m - 1] || ''} ${y}`;
  }
  return dateString;
}

function formatTanggalTabel(dateString: string): string {
  if (!dateString) return '-';
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    const bulanIndo = [
      'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
      'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
    ];
    return `${d} ${bulanIndo[m - 1] || ''} ${y}`;
  }
  return dateString;
}

export async function exportTransaksiToPdf(
  transaksiList: Transaksi[],
  fileNamePrefix: string = 'Laporan_Keuangan_Fintrack'
) {
  if (!transaksiList || transaksiList.length === 0) {
    alert('Tidak ada transaksi untuk diekspor ke PDF.');
    return;
  }

  // Hitung ringkasan
  let totalPemasukan = 0;
  let totalPengeluaran = 0;

  transaksiList.forEach((t) => {
    const amt = Number(t.jumlah) || 0;
    if (t.tipe === 'pemasukan') totalPemasukan += amt;
    else if (t.tipe === 'pengeluaran') totalPengeluaran += amt;
  });

  const netCashflow = totalPemasukan - totalPengeluaran;

  const sortedList = [...transaksiList].sort(
    (a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
  );

  const tAwal = sortedList[sortedList.length - 1]?.tanggal;
  const tAkhir = sortedList[0]?.tanggal;

  let periodeText = '';
  if (!tAwal && !tAkhir) {
    periodeText = 'Periode: Semua Riwayat Transaksi';
  } else if (tAwal === tAkhir) {
    periodeText = `Periode: ${formatTanggalFormal(tAwal)}`;
  } else {
    periodeText = `Periode: ${formatTanggalTabel(tAwal)} s/d ${formatTanggalTabel(tAkhir)}`;
  }

  const now = new Date();
  const tanggalCetak = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(now);
  const fileDateStr = now.toISOString().split('T')[0];

  // Buat instance PDF A4 (210 x 297 mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
  const margin = 14;

  // 1. Header Banner Gradient Background (Emerald Modern)
  doc.setFillColor(16, 185, 129); // #10B981
  doc.roundedRect(margin, 12, pageWidth - margin * 2, 38, 4, 4, 'F');

  // Accent bar kiri
  doc.setFillColor(5, 150, 105); // #059669
  doc.rect(margin, 12, 4, 38, 'F');

  // Mascot Image dengan Aspect Ratio Alami (Preserve aspect ratio, tidak gepeng)
  const mascotInfo = await getMascotImageInfo('/mascot.png');
  if (mascotInfo) {
    try {
      const targetHeight = 32; // mm
      const aspectRatio = mascotInfo.width / mascotInfo.height;
      const targetWidth = targetHeight * aspectRatio; // ~48 mm (proposional 100%)
      const imgX = pageWidth - margin - targetWidth - 3;
      const imgY = 15;
      doc.addImage(mascotInfo.dataUrl, 'PNG', imgX, imgY, targetWidth, targetHeight);
    } catch (e) {
      console.warn('Gagal memuat gambar maskot ke PDF:', e);
    }
  }

  // Header Text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('LAPORAN RESMI KEUANGAN PRIBADI', margin + 8, 20);

  doc.setFontSize(20);
  doc.text('Fintrack', margin + 8, 29);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(236, 253, 245);
  doc.text('Ringkasan Mutasi Kas & Transaksi Finansial Pribadi', margin + 8, 36);
  doc.text(periodeText, margin + 8, 43);

  // 2. Metadata Bar
  doc.setDrawColor(226, 232, 240); // #E2E8F0
  doc.setFillColor(248, 250, 252); // #F8FAFC
  doc.roundedRect(margin, 54, pageWidth - margin * 2, 10, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105); // #475569
  doc.text(`Dicetak Pada: ${tanggalCetak}`, margin + 4, 60.5);
  doc.text(
    `Total Entri: ${transaksiList.length} Transaksi`,
    pageWidth - margin - 4,
    60.5,
    { align: 'right' }
  );

  // 3. Three Summary Stat Cards
  const cardWidth = (pageWidth - margin * 2 - 8) / 3; // ~58mm each
  const cardHeight = 18;
  const cardY = 67;

  // Card 1: Pemasukan
  doc.setFillColor(236, 253, 245); // #ECFDF5
  doc.setDrawColor(167, 243, 208); // #A7F3D0
  doc.roundedRect(margin, cardY, cardWidth, cardHeight, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL PEMASUKAN', margin + 4, cardY + 5.5);

  doc.setFontSize(12);
  doc.setTextColor(5, 150, 105); // #059669
  doc.text(`+${formatRupiah(totalPemasukan)}`, margin + 4, cardY + 13.5);

  // Card 2: Pengeluaran
  const card2X = margin + cardWidth + 4;
  doc.setFillColor(255, 241, 242); // #FFF1F2
  doc.setDrawColor(254, 205, 211); // #FECDD3
  doc.roundedRect(card2X, cardY, cardWidth, cardHeight, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL PENGELUARAN', card2X + 4, cardY + 5.5);

  doc.setFontSize(12);
  doc.setTextColor(225, 29, 72); // #E11D48
  doc.text(`-${formatRupiah(totalPengeluaran)}`, card2X + 4, cardY + 13.5);

  // Card 3: Arus Kas Bersih (Net)
  const card3X = card2X + cardWidth + 4;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(card3X, cardY, cardWidth, cardHeight, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('ARUS KAS BERSIH (NET)', card3X + 4, cardY + 5.5);

  doc.setFontSize(12);
  doc.setTextColor(
    netCashflow >= 0 ? 5 : 225,
    netCashflow >= 0 ? 150 : 29,
    netCashflow >= 0 ? 105 : 72
  );
  doc.text(
    `${netCashflow >= 0 ? '+' : ''}${formatRupiah(netCashflow)}`,
    card3X + 4,
    cardY + 13.5
  );

  // 4. Data Rows for Table (dengan tanggal format formal, bukan "Kemarin")
  const tableData = sortedList.map((trx, idx) => {
    const isIncome = trx.tipe === 'pemasukan';
    const isExpense = trx.tipe === 'pengeluaran';
    const tipeLabel = isIncome ? 'Pemasukan' : isExpense ? 'Pengeluaran' : 'Transfer';
    const nominalSign = isIncome ? '+' : isExpense ? '-' : '';
    const nominalText = `${nominalSign}${formatRupiah(trx.jumlah)}`;
    const kategoriText = trx.kategori?.nama || (trx.tipe === 'transfer' ? `Ke: ${trx.target_akun?.nama || '-'}` : '-');

    return [
      (idx + 1).toString(),
      formatTanggalTabel(trx.tanggal),
      tipeLabel,
      trx.akun?.nama || '-',
      kategoriText,
      nominalText,
      trx.keterangan || '-',
    ];
  });

  // 5. Render AutoTable
  autoTable(doc, {
    startY: 89,
    head: [['No', 'Tanggal', 'Tipe', 'Akun / Dompet', 'Kategori', 'Nominal (IDR)', 'Keterangan']],
    body: tableData,
    margin: { left: margin, right: margin, bottom: 18 },
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 2.8,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [16, 185, 129], // #10B981
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', textColor: [100, 116, 139] },
      1: { cellWidth: 26, fontStyle: 'bold' },
      2: { cellWidth: 24, halign: 'center' },
      3: { cellWidth: 28 },
      4: { cellWidth: 32, textColor: [71, 85, 105] },
      5: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
      6: { cellWidth: 'auto', textColor: [100, 116, 139] },
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const rowTrx = sortedList[data.row.index];
        if (!rowTrx) return;

        // Warna badge tipe
        if (data.column.index === 2) {
          if (rowTrx.tipe === 'pemasukan') {
            data.cell.styles.textColor = [5, 150, 105];
            data.cell.styles.fontStyle = 'bold';
          } else if (rowTrx.tipe === 'pengeluaran') {
            data.cell.styles.textColor = [225, 29, 72];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [2, 132, 199];
            data.cell.styles.fontStyle = 'bold';
          }
        }

        // Warna nominal
        if (data.column.index === 5) {
          if (rowTrx.tipe === 'pemasukan') {
            data.cell.styles.textColor = [5, 150, 105];
          } else if (rowTrx.tipe === 'pengeluaran') {
            data.cell.styles.textColor = [225, 29, 72];
          } else {
            data.cell.styles.textColor = [2, 132, 199];
          }
        }
      }
    },
    didDrawPage: (data) => {
      const totalPages = doc.getNumberOfPages();
      const currentPage = data.pageNumber;
      const pageH = doc.internal.pageSize.getHeight();

      doc.setDrawColor(226, 232, 240);
      doc.line(margin, pageH - 12, pageWidth - margin, pageH - 12);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // #94A3B8
      doc.text(
        'Fintrack Personal Finance PWA • Dokumen Keuangan Resmi Pribadi',
        margin,
        pageH - 7
      );

      doc.text(
        `Halaman ${currentPage} dari ${totalPages}`,
        pageWidth - margin,
        pageH - 7,
        { align: 'right' }
      );
    },
  });

  // 6. Download file PDF langsung ke perangkat (No print dialog)
  const fullFileName = `${fileNamePrefix}_${fileDateStr}.pdf`;
  doc.save(fullFileName);
}
