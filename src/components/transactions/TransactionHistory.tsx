'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { Transaksi, Akun, Kategori, db, recalculateAllAccountBalances } from '@/lib/db';
import { formatRupiah, formatTanggal } from '@/lib/utils/format';
import { exportTransaksiToPdf } from '@/lib/utils/exportPdf';
import {
  FileText,
  Search,
  ArrowRightLeft,
  Image as ImageIcon,
  Edit2,
  Trash2,
  X,
  ZoomIn,
  Loader2,
  Receipt,
} from 'lucide-react';
import CategoryIcon from '@/components/categories/CategoryIcon';

interface TransactionHistoryProps {
  transactions: Transaksi[];
  accounts?: Akun[];
  categories?: Kategori[];
  onRefresh: () => void;
  loading: boolean;
  onEditTransaction?: (trx: Transaksi) => void;
}

export default function TransactionHistory({
  transactions,
  onRefresh,
  loading,
  onEditTransaction,
}: TransactionHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedTx, setSelectedTx] = useState<Transaksi | null>(null);
  const [zoomedPhotoUrl, setZoomedPhotoUrl] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Filter transaksi berdasarkan pencarian dan tipe
  const filteredList = useMemo(() => {
    return transactions.filter((t) => {
      // Filter tipe
      if (filterType !== 'all' && t.tipe !== filterType) {
        return false;
      }

      // Filter query pencarian
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchKeterangan = t.keterangan?.toLowerCase().includes(q);
      const matchKategori = t.kategori?.nama.toLowerCase().includes(q);
      const matchAkun = t.akun?.nama.toLowerCase().includes(q);
      const matchTargetAkun = t.target_akun?.nama.toLowerCase().includes(q);
      const matchNominal = t.jumlah.toString().includes(q);

      return matchKeterangan || matchKategori || matchAkun || matchTargetAkun || matchNominal;
    });
  }, [transactions, searchQuery, filterType]);

  // Kelompokkan transaksi per tanggal (Grouped by Date)
  const groupedTransactions = useMemo(() => {
    const groups: Record<
      string,
      { label: string; date: string; items: Transaksi[]; totalMasuk: number; totalKeluar: number }
    > = {};

    filteredList.forEach((trx) => {
      const dateKey = trx.tanggal;
      if (!groups[dateKey]) {
        groups[dateKey] = {
          label: formatTanggal(trx.tanggal),
          date: dateKey,
          items: [],
          totalMasuk: 0,
          totalKeluar: 0,
        };
      }
      groups[dateKey].items.push(trx);
      if (trx.tipe === 'pemasukan') {
        groups[dateKey].totalMasuk += Number(trx.jumlah);
      } else if (trx.tipe === 'pengeluaran') {
        groups[dateKey].totalKeluar += Number(trx.jumlah);
      }
    });

    return Object.values(groups).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [filteredList]);

  // Hapus transaksi
  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Yakin ingin menghapus catatan transaksi ini? Saldo dompet akan dihitung ulang.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await db.transaksi.delete(id);
      await recalculateAllAccountBalances();
      setSelectedTx(null);
      onRefresh();
    } catch (err) {
      console.error('Gagal menghapus transaksi:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = async () => {
    if (filteredList.length === 0) return;
    setIsExporting(true);
    try {
      await exportTransaksiToPdf(filteredList);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header and Export PDF Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Histori Transaksi</h2>
          <p className="text-xs text-slate-500">Catatan keluar masuk dana per hari</p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={filteredList.length === 0 || isExporting}
          className="py-2 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-emerald-700 rounded-xl flex items-center gap-1.5 disabled:opacity-50 transition-colors shadow-xs"
        >
          {isExporting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
          ) : (
            <FileText className="w-3.5 h-3.5 text-emerald-600" />
          )}
          <span>Export PDF</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari transaksi, kategori, atau akun..."
            className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
          />
        </div>

        {/* Tipe Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'Semua' },
            { id: 'pengeluaran', label: 'Pengeluaran' },
            { id: 'pemasukan', label: 'Pemasukan' },
            { id: 'transfer', label: 'Transfer' },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setFilterType(pill.id)}
              className={`py-1.5 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                filterType === pill.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions List */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-16 bg-slate-200 rounded-2xl" />
          <div className="h-16 bg-slate-200 rounded-2xl" />
          <div className="h-16 bg-slate-200 rounded-2xl" />
        </div>
      ) : groupedTransactions.length === 0 ? (
        <div className="py-10 text-center bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
          <div className="w-24 h-24 mx-auto mb-2 relative">
            <Image
              src="/mascot.png"
              alt="Fintrack Mascot"
              width={96}
              height={96}
              className="object-contain drop-shadow-md mx-auto"
            />
          </div>
          <p className="text-sm font-bold text-slate-900">Belum ada catatan transaksi</p>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            {searchQuery || filterType !== 'all'
              ? 'Tidak ada transaksi yang cocok dengan pencarian Anda.'
              : 'Mulai catat transaksi pertama Anda dengan menekan tombol + di bagian bawah.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedTransactions.map((group) => (
            <div key={group.date} className="space-y-2">
              <div className="flex items-center justify-between px-1 text-xs">
                <span className="font-bold text-slate-800">{group.label}</span>
                <div className="flex items-center gap-3 text-[11px] tabular-nums font-semibold">
                  {group.totalMasuk > 0 && (
                    <span className="text-emerald-600">+{formatRupiah(group.totalMasuk)}</span>
                  )}
                  {group.totalKeluar > 0 && (
                    <span className="text-rose-600">-{formatRupiah(group.totalKeluar)}</span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                {group.items.map((trx) => {
                  const isExpense = trx.tipe === 'pengeluaran';
                  const isIncome = trx.tipe === 'pemasukan';
                  const isTransfer = trx.tipe === 'transfer';

                  return (
                    <div
                      key={trx.id}
                      onClick={() => setSelectedTx(trx)}
                      className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between cursor-pointer transition-colors shadow-xs active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Transaction Icon Badge with CategoryIcon */}
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: isTransfer
                              ? '#EFF6FF'
                              : `${trx.kategori?.warna_hex || (isExpense ? '#F43F5E' : '#10B981')}1A`,
                            color: isTransfer
                              ? '#3B82F6'
                              : trx.kategori?.warna_hex || (isExpense ? '#F43F5E' : '#10B981'),
                          }}
                        >
                          {isTransfer ? (
                            <ArrowRightLeft className="w-4 h-4 text-sky-600" />
                          ) : (
                            <CategoryIcon name={trx.kategori?.icon} className="w-5 h-5" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {isTransfer
                              ? `Transfer ke ${trx.target_akun?.nama || 'Akun Tujuan'}`
                              : trx.kategori?.nama || trx.keterangan || 'Tanpa Kategori'}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5 truncate">
                            <span className="font-medium">{trx.akun?.nama}</span>
                            {trx.keterangan && <span>• {trx.keterangan}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex items-center gap-2">
                        {trx.foto_url && (
                          <ImageIcon className="w-3.5 h-3.5 text-sky-500" />
                        )}
                        <p
                          className={`text-xs font-extrabold tabular-nums ${
                            isExpense
                              ? 'text-rose-600'
                              : isIncome
                              ? 'text-emerald-600'
                              : 'text-sky-600'
                          }`}
                        >
                          {isExpense ? '-' : isIncome ? '+' : ''}
                          {formatRupiah(trx.jumlah)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transaction Detail Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Detail Transaksi</h3>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center py-2">
              <span
                className={`text-xs uppercase font-bold px-3 py-1 rounded-full ${
                  selectedTx.tipe === 'pengeluaran'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : selectedTx.tipe === 'pemasukan'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-sky-50 text-sky-700 border border-sky-200'
                }`}
              >
                {selectedTx.tipe}
              </span>
              <h4 className="text-2xl font-black text-slate-900 mt-2 tabular-nums">
                {formatRupiah(selectedTx.jumlah)}
              </h4>
            </div>

            <div className="text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div className="space-y-2 divide-y divide-slate-100">
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Tanggal:</span>
                  <span className="font-semibold text-slate-900">{formatTanggal(selectedTx.tanggal)}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Akun:</span>
                  <span className="font-semibold text-slate-900">{selectedTx.akun?.nama || '-'}</span>
                </div>
                {selectedTx.tipe === 'transfer' && (
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Tujuan Transfer:</span>
                    <span className="font-semibold text-slate-900">{selectedTx.target_akun?.nama || '-'}</span>
                  </div>
                )}
                {selectedTx.kategori && (
                  <div className="flex justify-between py-1.5 items-center">
                    <span className="text-slate-500">Kategori:</span>
                    <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <CategoryIcon name={selectedTx.kategori.icon} className="w-3.5 h-3.5" />
                      <span>{selectedTx.kategori.nama}</span>
                    </span>
                  </div>
                )}
                {selectedTx.keterangan && (
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Keterangan:</span>
                    <span className="text-slate-900 text-right">{selectedTx.keterangan}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Lampiran Foto Bukti dengan Tombol Zoom */}
            {selectedTx.foto_url && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-700">Foto Bukti / Struk</span>
                  <button
                    type="button"
                    onClick={() => selectedTx.foto_url && setZoomedPhotoUrl(selectedTx.foto_url)}
                    className="text-[11px] font-semibold text-sky-600 hover:underline flex items-center gap-1"
                  >
                    <ZoomIn className="w-3 h-3" />
                    <span>Perbesar</span>
                  </button>
                </div>
                <div
                  onClick={() => selectedTx.foto_url && setZoomedPhotoUrl(selectedTx.foto_url)}
                  className="rounded-2xl overflow-hidden border border-slate-200 max-h-48 cursor-pointer relative group bg-slate-50"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedTx.foto_url}
                    alt="Bukti Struk"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold transition-opacity">
                    Klik untuk perbesar
                  </div>
                </div>
              </div>
            )}

            {/* Tombol Aksi: Edit & Hapus */}
            <div className="pt-2 flex gap-2">
              {onEditTransaction && (
                <button
                  type="button"
                  onClick={() => {
                    const toEdit = selectedTx;
                    setSelectedTx(null);
                    onEditTransaction(toEdit);
                  }}
                  className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Ubah Data</span>
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  selectedTx.id &&
                  handleDeleteTransaction(selectedTx.id)
                }
                disabled={isDeleting}
                className="flex-1 py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-2xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal Zoom Foto Ukuran Penuh */}
      {zoomedPhotoUrl && (
        <div
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
          onClick={() => setZoomedPhotoUrl(null)}
        >
          <div className="relative max-w-lg max-h-[85vh] w-full flex items-center justify-center">
            <button
              type="button"
              onClick={() => setZoomedPhotoUrl(null)}
              className="absolute -top-10 right-0 p-2 text-white/80 hover:text-white"
              aria-label="Tutup foto"
            >
              <X className="w-6 h-6" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={zoomedPhotoUrl}
              alt="Bukti Struk Full"
              className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
