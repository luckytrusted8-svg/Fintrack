'use client';

import React, { useState } from 'react';
import { TransaksiRutin, Akun, Kategori, db, recalculateAccountBalance } from '@/lib/db';
import { formatRupiah, toInputDateFormat } from '@/lib/utils/format';
import {
  Repeat,
  Plus,
  Calendar,
  Play,
  X,
  Trash2,
  Loader2,
} from 'lucide-react';
import CategoryIcon from '@/components/categories/CategoryIcon';

interface RecurringSectionProps {
  recurringList: TransaksiRutin[];
  accounts: Akun[];
  categories: Kategori[];
  onRefresh: () => void;
  loading: boolean;
}

export default function RecurringSection({
  recurringList,
  accounts,
  categories,
  onRefresh,
  loading,
}: RecurringSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [keterangan, setKeterangan] = useState('');
  const [jumlah, setJumlah] = useState('');
  const [tipe, setTipe] = useState<'pengeluaran' | 'pemasukan'>('pengeluaran');
  const [accountId, setAccountId] = useState(accounts[0]?.id?.toString() || '');
  const [categoryId, setCategoryId] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState('1');

  const [executingId, setExecutingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleCreateRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(jumlah.replace(/\D/g, '')) || 0;
    if (amount <= 0 || !keterangan.trim() || !accountId) return;

    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      await db.transaksi_rutin.add({
        akun_id: accountId,
        kategori_id: categoryId || undefined,
        tipe,
        jumlah: amount,
        keterangan: keterangan.trim(),
        tanggal_setiap_bulan: parseInt(dayOfMonth, 10),
        is_active: true,
        auto_generate: false,
        created_at: now,
        updated_at: now,
      });

      setKeterangan('');
      setJumlah('');
      setIsModalOpen(false);
      onRefresh();
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecuteNow = async (item: TransaksiRutin) => {
    if (!item.id) return;
    setExecutingId(item.id);
    try {
      const now = new Date().toISOString();
      await db.transaksi.add({
        akun_id: item.akun_id,
        kategori_id: item.kategori_id,
        tipe: item.tipe,
        jumlah: item.jumlah,
        keterangan: `[Rutin] ${item.keterangan}`,
        tanggal: toInputDateFormat(),
        created_at: now,
        updated_at: now,
      });

      await recalculateAccountBalance(item.akun_id);

      await db.transaksi_rutin.update(item.id, {
        terakhir_dijalankan: toInputDateFormat(),
        updated_at: now,
      });

      onRefresh();
    } finally {
      setExecutingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus transaksi rutin ini?')) return;
    await db.transaksi_rutin.delete(id);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Tagihan & Transaksi Rutin</h3>
          <p className="text-[11px] text-slate-500">Jadwal pengeluaran berulang setiap bulan</p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow-md shadow-emerald-600/20 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Rutin</span>
        </button>
      </div>

      {loading ? (
        <div className="h-28 bg-slate-200 rounded-3xl animate-pulse" />
      ) : recurringList.length === 0 ? (
        <div className="py-8 px-4 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
          <Repeat className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-900">Belum ada jadwal transaksi rutin</p>
          <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
            Daftarkan tagihan WiFi, sewa kos, cicilan, atau gaji bulanan agar tidak lupa dicatat.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {recurringList.map((item) => (
            <div
              key={item.id}
              className="p-3.5 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    item.tipe === 'pengeluaran'
                      ? 'bg-rose-50 text-rose-600'
                      : 'bg-emerald-50 text-emerald-600'
                  }`}
                >
                  {item.kategori ? (
                    <CategoryIcon name={item.kategori.icon} className="w-4 h-4" />
                  ) : (
                    <Repeat className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">{item.keterangan}</p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-emerald-600" />
                      Tiap tanggal {item.tanggal_setiap_bulan}
                    </span>
                    <span>• {item.akun?.nama}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-extrabold tabular-nums ${
                    item.tipe === 'pengeluaran' ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {item.tipe === 'pengeluaran' ? '-' : '+'}
                  {formatRupiah(item.jumlah)}
                </span>
                <button
                  type="button"
                  title="Eksekusi catat transaksi sekarang"
                  onClick={() => handleExecuteNow(item)}
                  disabled={executingId === item.id}
                  className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-emerald-600 transition-colors"
                >
                  {executingId === item.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => item.id && handleDelete(item.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                  aria-label="Hapus jadwal"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Tambah Transaksi Rutin */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Jadwal Transaksi Rutin</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRecurring} className="space-y-3.5 mt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama / Keterangan</label>
                <input
                  type="text"
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Contoh: Tagihan WiFi Indihome"
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tipe</label>
                  <select
                    value={tipe}
                    onChange={(e) => setTipe(e.target.value as 'pengeluaran' | 'pemasukan')}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="pengeluaran">Pengeluaran</option>
                    <option value="pemasukan">Pemasukan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Tiap Bulan</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nominal</label>
                <input
                  type="text"
                  value={jumlah ? formatRupiah(parseFloat(jumlah.replace(/\D/g, ''))) : ''}
                  onChange={(e) => setJumlah(e.target.value.replace(/\D/g, ''))}
                  placeholder="Rp 0"
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Akun Terkait</label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center transition-colors shadow-xs"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Jadwal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
