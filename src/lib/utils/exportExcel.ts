import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Transaksi } from '../db';

export async function exportTransaksiToExcel(
  transaksiList: Transaksi[],
  fileNamePrefix: string = 'Laporan_Keuangan_Fintrack'
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Fintrack';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Histori Transaksi');

  worksheet.columns = [
    { header: 'No', key: 'no', width: 6 },
    { header: 'Tanggal', key: 'tanggal', width: 14 },
    { header: 'Tipe', key: 'tipe', width: 14 },
    { header: 'Akun / Dompet', key: 'akun', width: 20 },
    { header: 'Kategori', key: 'kategori', width: 22 },
    { header: 'Nominal (IDR)', key: 'jumlah', width: 18 },
    { header: 'Keterangan', key: 'keterangan', width: 32 },
    { header: 'Lampiran Bukti', key: 'foto_url', width: 25 },
  ];

  // Header style
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF10B981' }, // Brand Emerald
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  transaksiList.forEach((trx, idx) => {
    const tipeText = trx.tipe === 'pemasukan' 
      ? 'Pemasukan' 
      : trx.tipe === 'pengeluaran' 
      ? 'Pengeluaran' 
      : `Transfer -> ${trx.target_akun?.nama || 'Akun Tujuan'}`;

    const row = worksheet.addRow({
      no: idx + 1,
      tanggal: trx.tanggal,
      tipe: tipeText,
      akun: trx.akun?.nama || '-',
      kategori: trx.kategori?.nama || (trx.tipe === 'transfer' ? 'Transfer Saldo' : '-'),
      jumlah: Number(trx.jumlah),
      keterangan: trx.keterangan || '-',
      foto_url: trx.foto_url || 'Tidak ada',
    });

    // Format number
    const cellJumlah = row.getCell('jumlah');
    cellJumlah.numFmt = '#,##0';
    if (trx.tipe === 'pemasukan') {
      cellJumlah.font = { color: { argb: 'FF059669' }, bold: true };
    } else if (trx.tipe === 'pengeluaran') {
      cellJumlah.font = { color: { argb: 'FFE11D48' } };
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  
  const today = new Date().toISOString().split('T')[0];
  saveAs(blob, `${fileNamePrefix}_${today}.xlsx`);
}
