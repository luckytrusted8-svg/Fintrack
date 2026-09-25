import { Transaksi } from '../db';
import { formatRupiah, formatTanggal } from './format';

export async function exportTransaksiToPdf(
  transaksiList: Transaksi[],
  title: string = 'Laporan Keuangan Fintrack'
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

  // Format tanggal rentang & tanggal cetak
  const now = new Date();
  const tanggalCetak = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(now);

  const sortedList = [...transaksiList].sort(
    (a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
  );

  const periodeAwal = sortedList[sortedList.length - 1]?.tanggal
    ? formatTanggal(sortedList[sortedList.length - 1].tanggal)
    : '-';
  const periodeAkhir = sortedList[0]?.tanggal ? formatTanggal(sortedList[0].tanggal) : '-';

  // Pre-load mascot & logo into base64 data URIs for 100% offline print reliability
  let mascotDataUrl = '/mascot.png';
  let logoDataUrl = '/logo.png';
  try {
    const [mRes, lRes] = await Promise.all([
      fetch('/mascot.png').catch(() => null),
      fetch('/logo.png').catch(() => null),
    ]);
    if (mRes && mRes.ok) {
      const b = await mRes.blob();
      mascotDataUrl = await new Promise<string>((res) => {
        const r = new FileReader();
        r.onloadend = () => res(r.result as string);
        r.readAsDataURL(b);
      });
    }
    if (lRes && lRes.ok) {
      const b = await lRes.blob();
      logoDataUrl = await new Promise<string>((res) => {
        const r = new FileReader();
        r.onloadend = () => res(r.result as string);
        r.readAsDataURL(b);
      });
    }
  } catch {
    // Keep relative URLs if fetch fails
  }

  const rowsHtml = sortedList
    .map((trx, idx) => {
      const isIncome = trx.tipe === 'pemasukan';
      const isExpense = trx.tipe === 'pengeluaran';
      const badgeClass = isIncome
        ? 'badge-income'
        : isExpense
        ? 'badge-expense'
        : 'badge-transfer';
      const badgeLabel = isIncome ? 'Pemasukan' : isExpense ? 'Pengeluaran' : 'Transfer';
      const nominalClass = isIncome ? 'text-income' : isExpense ? 'text-expense' : 'text-transfer';
      const nominalPrefix = isIncome ? '+' : isExpense ? '-' : '';

      return `
      <tr>
        <td class="text-center font-mono text-muted">${idx + 1}</td>
        <td class="whitespace-nowrap font-medium">${formatTanggal(trx.tanggal)}</td>
        <td>
          <span class="badge ${badgeClass}">${badgeLabel}</span>
        </td>
        <td class="font-medium">${trx.akun?.nama || '-'}</td>
        <td class="text-muted">${trx.kategori?.nama || (trx.tipe === 'transfer' ? `Transfer ke ${trx.target_akun?.nama || '-'}` : '-')}</td>
        <td class="text-right font-bold tabular-nums ${nominalClass}">
          ${nominalPrefix}${formatRupiah(trx.jumlah)}
        </td>
        <td class="text-muted text-small">${trx.keterangan || '-'}</td>
      </tr>
    `;
    })
    .join('');

  const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${title} - ${now.toISOString().split('T')[0]}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm 12mm 14mm 12mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      padding: 16px;
      font-size: 11px;
      line-height: 1.45;
    }
    .header-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: linear-gradient(135deg, #059669 0%, #10b981 60%, #34d399 100%);
      color: #ffffff;
      padding: 20px 24px;
      border-radius: 20px;
      margin-bottom: 20px;
      box-shadow: 0 4px 15px rgba(16, 185, 129, 0.2);
    }
    .brand-section {
      max-width: 60%;
    }
    .brand-badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(8px);
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin-bottom: 4px;
      line-height: 1.2;
    }
    .brand-sub {
      font-size: 11px;
      opacity: 0.92;
      font-weight: 400;
    }
    .mascot-box {
      width: 110px;
      height: 110px;
      display: flex;
      align-items: center;
      justify-content: center;
      filter: drop-shadow(0 8px 12px rgba(0, 0, 0, 0.15));
    }
    .mascot-img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .meta-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      margin-bottom: 16px;
      font-size: 10.5px;
      color: #475569;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .stat-card {
      padding: 14px 16px;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
    }
    .stat-card.income {
      border-color: #a7f3d0;
      background: #ecfdf5;
    }
    .stat-card.expense {
      border-color: #fecdd3;
      background: #fff1f2;
    }
    .stat-card.net {
      border-color: #cbd5e1;
      background: #f8fafc;
    }
    .stat-label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
      color: #64748b;
    }
    .stat-val {
      font-size: 17px;
      font-weight: 800;
      line-height: 1.2;
    }
    .stat-card.income .stat-val {
      color: #059669;
    }
    .stat-card.expense .stat-val {
      color: #e11d48;
    }
    .stat-card.net .stat-val {
      color: ${netCashflow >= 0 ? '#059669' : '#e11d48'};
    }
    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin-bottom: 24px;
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      padding: 10px 12px;
      border-bottom: 1px solid #cbd5e1;
      text-align: left;
    }
    td {
      padding: 9px 12px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 10.5px;
      vertical-align: middle;
    }
    tr:last-child td {
      border-bottom: none;
    }
    tr:nth-child(even) td {
      background: #fafafa;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .whitespace-nowrap { white-space: nowrap; }
    .font-medium { font-weight: 600; }
    .font-bold { font-weight: 700; }
    .text-muted { color: #64748b; }
    .text-small { font-size: 9.5px; }
    .tabular-nums { font-variant-numeric: tabular-nums; }
    .text-income { color: #059669; }
    .text-expense { color: #e11d48; }
    .text-transfer { color: #0284c7; }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 8px;
      font-size: 9px;
      font-weight: 700;
      text-transform: capitalize;
    }
    .badge-income {
      background: #d1fae5;
      color: #065f46;
    }
    .badge-expense {
      background: #ffe4e6;
      color: #9f1239;
    }
    .badge-transfer {
      background: #e0f2fe;
      color: #075985;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 14px;
      border-top: 1px dashed #cbd5e1;
      color: #94a3b8;
      font-size: 9.5px;
    }
    .footer-brand {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
      color: #64748b;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
      tr {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header-card">
    <div class="brand-section">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
        <img src="${logoDataUrl}" style="width: 28px; height: 28px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" alt="Logo">
        <span class="brand-badge">Laporan Resmi Keuangan</span>
      </div>
      <h1 class="brand-title">Fintrack</h1>
      <p class="brand-sub">Ringkasan Mutasi Kas & Transaksi Finansial Pribadi</p>
    </div>
    <div class="mascot-box">
      <img src="${mascotDataUrl}" class="mascot-img" alt="Fintrack Mascot">
    </div>
  </div>

  <div class="meta-bar">
    <div><strong>Periode Transaksi:</strong> ${periodeAwal} &mdash; ${periodeAkhir}</div>
    <div><strong>Dicetak Pada:</strong> ${tanggalCetak}</div>
    <div><strong>Total Entri:</strong> ${transaksiList.length} Transaksi</div>
  </div>

  <div class="summary-grid">
    <div class="stat-card income">
      <div class="stat-label">Total Pemasukan</div>
      <div class="stat-val">+${formatRupiah(totalPemasukan)}</div>
    </div>
    <div class="stat-card expense">
      <div class="stat-label">Total Pengeluaran</div>
      <div class="stat-val">-${formatRupiah(totalPengeluaran)}</div>
    </div>
    <div class="stat-card net">
      <div class="stat-label">Arus Kas Bersih (Net)</div>
      <div class="stat-val">${netCashflow >= 0 ? '+' : ''}${formatRupiah(netCashflow)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 32px;" class="text-center">No</th>
        <th style="width: 90px;">Tanggal</th>
        <th style="width: 85px;">Tipe</th>
        <th style="width: 110px;">Akun / Dompet</th>
        <th style="width: 110px;">Kategori</th>
        <th style="width: 110px;" class="text-right">Nominal</th>
        <th>Keterangan</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="footer">
    <div class="footer-brand">
      <span>●</span>
      <span>Fintrack Personal Finance PWA &bull; Privasi Penuh Offline</span>
    </div>
    <div>Halaman 1 dari 1</div>
  </div>
</body>
</html>
`;

  // Gunakan invisible iframe untuk print langsung tanpa popup blocker
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    alert('Gagal membuat cetakan PDF.');
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(htmlContent);
  doc.close();

  // Tunggu gambar mascot termuat sempurna sebelum memicu dialog print
  const triggerPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('Print error:', e);
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }
  };

  const mascotImg = doc.querySelector('.mascot-img') as HTMLImageElement | null;
  if (mascotImg && !mascotImg.complete) {
    mascotImg.onload = () => setTimeout(triggerPrint, 300);
    mascotImg.onerror = () => setTimeout(triggerPrint, 300);
  } else {
    setTimeout(triggerPrint, 300);
  }
}
