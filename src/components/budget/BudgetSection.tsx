'use client';

import React, { useState, useMemo } from 'react';
import { Anggaran, Kategori, Transaksi, db } from '@/lib/db';
import { formatRupiah, getNamaBulan } from '@/lib/utils/format';
import {
  PieChart,
  Plus,
  AlertTriangle,
  X,
  Loader2,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import CategoryIcon from '@/components/categories/CategoryIcon';

interface BudgetSectionProps {
  budgets: Anggaran[];
  categories: Kategori[];
  transactions: Transaksi[];
  selectedMonth: number;
  selectedYear: number;
  onRefresh: () => void;
  loading: boolean;
}

export default function BudgetSection({
  budgets,
  categories,
  transactions,
  selectedMonth,
  selectedYear,
  onRefresh,
  loading,
}: BudgetSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState('');
  const [nominalLimit, setNominalLimit] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Hanya kategori pengeluaran
  const expenseCategories = useMemo(() => {
    return categories.filter((c) => c.tipe === 'pengeluaran');
  }, [categories]);

  // Hitung pengeluaran per kategori di bulan & tahun yang dipilih
  const categoryExpenses = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach((t) => {
      if (t.tipe !== 'pengeluaran' || !t.kategori_id || !t.tanggal) return;
      let m = 0;
      let y = 0;
      if (t.tanggal.includes('-')) {
        const [yStr, mStr] = t.tanggal.split('-');
        y = parseInt(yStr, 10);
        m = parseInt(mStr, 10);
      } else {
        const d = new Date(t.tanggal);
        m = d.getMonth() + 1;
        y = d.getFullYear();
      }

      if (m === selectedMonth && y === selectedYear) {
        map[t.kategori_id] = (map[t.kategori_id] || 0) + Number(t.jumlah);
      }
    });
    return map;
  }, [transactions, selectedMonth, selectedYear]);

  // Budget list dengan kalkulasi terpakai
  const computedBudgets = useMemo(() => {
    return budgets.map((b) => {
      const terpakai = categoryExpenses[b.kategori_id] || 0;
      const limit = Number(b.nominal_limit);
      const percentage = limit > 0 ? (terpakai / limit) * 100 : 0;
      return {
        ...b,
        terpakai,
        percentage,
        isOver: percentage >= 100,
        isWarning: percentage >= 80 && percentage < 100,
      };
    });
  }, [budgets, categoryExpenses]);

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const limit = parseFloat(nominalLimit.replace(/\D/g, '')) || 0;
    if (!selectedCatId || limit <= 0) {
      setErrorMsg('Pilih kategori dan tentukan nominal batas anggaran.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const now = new Date().toISOString();
      const existing = await db.anggaran
        .where({
          kategori_id: selectedCatId,
          bulan: selectedMonth,
          tahun: selectedYear,
        })
        .first();

      if (existing && existing.id) {
        await db.anggaran.update(existing.id, {
          nominal_limit: limit,
          updated_at: now,
        });
      } else {
        await db.anggaran.add({
          kategori_id: selectedCatId,
          bulan: selectedMonth,
          tahun: selectedYear,
          nominal_limit: limit,
          created_at: now,
          updated_at: now,
        });
      }

      setIsModalOpen(false);
      setNominalLimit('');
      setSelectedCatId('');
      onRefresh();
    } catch {
      setErrorMsg('Gagal menyimpan anggaran.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBudget = async (id: string) => {
    if (!confirm('Hapus limit anggaran kategori ini?')) return;
    await db.anggaran.delete(id);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Anggaran Bulanan</h3>
          <p className="text-[11px] text-slate-500">
            Limit belanja per kategori di {getNamaBulan(selectedMonth)} {selectedYear}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow-md shadow-emerald-600/20 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Set Anggaran</span>
        </button>
      </div>

      {loading ? (
        <div className="h-32 bg-slate-200 rounded-3xl animate-pulse" />
      ) : computedBudgets.length === 0 ? (
        <div className="py-8 px-4 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
          <PieChart className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-900">Belum ada anggaran bulanan</p>
          <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
            Pasang batas pengeluaran untuk kategori seperti Makanan, Transportasi, atau Belanja agar keuangan tetap terkontrol.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {computedBudgets.map((b) => {
            const barWidth = Math.min(100, b.percentage);
            const statusColor = b.isOver
              ? 'bg-rose-500'
              : b.isWarning
              ? 'bg-amber-500'
              : 'bg-emerald-600';

            const textColor = b.isOver
              ? 'text-rose-600'
              : b.isWarning
              ? 'text-amber-600'
              : 'text-emerald-600';

            return (
              <div
                key={b.id}
                className="p-4 bg-white border border-slate-200 rounded-3xl shadow-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: `${b.kategori?.warna_hex || '#10B981'}1A`,
                        color: b.kategori?.warna_hex || '#10B981',
                      }}
                    >
                      <CategoryIcon name={b.kategori?.icon} className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-900">
                      {b.kategori?.nama}
                    </span>
                    {b.isOver && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        <AlertCircle className="w-3 h-3" />
                        Over Budget
                      </span>
                    )}
                    {b.isWarning && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <AlertTriangle className="w-3 h-3" />
                        Peringatan 80%
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => b.id && handleDeleteBudget(b.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    aria-label="Hapus anggaran"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs mb-1.5 tabular-nums">
                  <span className={`font-bold ${textColor}`}>
                    {formatRupiah(b.terpakai)}
                  </span>
                  <span className="text-slate-500 font-medium">
                    Batas: {formatRupiah(b.nominal_limit)}
                  </span>
                </div>

                <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200/60">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${statusColor}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>

                <div className="flex justify-between items-center mt-1.5 text-[10px] text-slate-500 font-medium">
                  <span>{b.percentage.toFixed(0)}% terpakai</span>
                  <span>Sisa: {formatRupiah(Math.max(0, Number(b.nominal_limit) - b.terpakai))}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Set Anggaran */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Atur Limit Anggaran</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 text-xs text-rose-700 rounded-xl">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveBudget} className="space-y-3.5 mt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kategori Pengeluaran
                </label>
                <select
                  value={selectedCatId}
                  onChange={(e) => setSelectedCatId(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Pilih kategori...</option>
                  {expenseCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Batas Maksimal Bulanan
                </label>
                <input
                  type="text"
                  value={nominalLimit ? formatRupiah(parseFloat(nominalLimit.replace(/\D/g, ''))) : ''}
                  onChange={(e) => setNominalLimit(e.target.value.replace(/\D/g, ''))}
                  placeholder="Rp 0"
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 tabular-nums"
                />
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
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Anggaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
