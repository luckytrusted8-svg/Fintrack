'use client';

import React, { useMemo } from 'react';
import { Transaksi, Tabungan, Anggaran } from '@/lib/db';
import { formatRupiah } from '@/lib/utils/format';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Target,
  PieChart,
  CheckCircle2,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import CategoryIcon from '@/components/categories/CategoryIcon';

interface FinancialInsightsProps {
  transactions: Transaksi[];
  savings: Tabungan[];
  budgets?: Anggaran[];
  currentMonth: number;
  currentYear: number;
}

export default function FinancialInsights({
  transactions,
  savings,
  budgets = [],
  currentMonth,
  currentYear,
}: FinancialInsightsProps) {
  const analysis = useMemo(() => {
    let lastMonth = currentMonth - 1;
    let lastYear = currentYear;
    if (lastMonth === 0) {
      lastMonth = 12;
      lastYear = currentYear - 1;
    }

    const currentExpensesByCategory: Record<string, { total: number; icon?: string; color?: string }> = {};
    const lastExpensesByCategory: Record<string, number> = {};

    let totalExpenseCurrent = 0;
    let totalIncomeCurrent = 0;
    let totalExpenseLast = 0;

    const today = new Date();
    const isCurrentActiveMonth =
      today.getMonth() + 1 === currentMonth && today.getFullYear() === currentYear;
    const daysPassed = isCurrentActiveMonth ? Math.max(1, today.getDate()) : 30;

    transactions.forEach((t) => {
      const d = new Date(t.tanggal);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const amount = Number(t.jumlah) || 0;

      if (m === currentMonth && y === currentYear) {
        if (t.tipe === 'pengeluaran') {
          totalExpenseCurrent += amount;
          const catName = t.kategori?.nama || 'Lain-lain';
          if (!currentExpensesByCategory[catName]) {
            currentExpensesByCategory[catName] = {
              total: 0,
              icon: t.kategori?.icon,
              color: t.kategori?.warna_hex,
            };
          }
          currentExpensesByCategory[catName].total += amount;
        } else if (t.tipe === 'pemasukan') {
          totalIncomeCurrent += amount;
        }
      } else if (m === lastMonth && y === lastYear) {
        if (t.tipe === 'pengeluaran') {
          totalExpenseLast += amount;
          const catName = t.kategori?.nama || 'Lain-lain';
          lastExpensesByCategory[catName] = (lastExpensesByCategory[catName] || 0) + amount;
        }
      }
    });

    // Urutkan kategori pengeluaran tertinggi bulan ini
    const sortedCategories = Object.entries(currentExpensesByCategory)
      .map(([name, data]) => ({
        name,
        total: data.total,
        icon: data.icon,
        color: data.color,
        percent: totalExpenseCurrent > 0 ? (data.total / totalExpenseCurrent) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    const topCategory = sortedCategories[0] || null;

    // Hitung rata-rata pengeluaran harian
    const dailyAverage = totalExpenseCurrent > 0 ? Math.round(totalExpenseCurrent / daysPassed) : 0;

    // Arus kas bersih
    const netCashFlow = totalIncomeCurrent - totalExpenseCurrent;

    // Perbandingan kategori dengan bulan lalu
    const categoryComparisons: Array<{
      category: string;
      current: number;
      last: number;
      diffPercent: number;
      isUp: boolean;
      icon?: string;
    }> = [];

    Object.keys(currentExpensesByCategory).forEach((cat) => {
      const currentVal = currentExpensesByCategory[cat].total;
      const lastVal = lastExpensesByCategory[cat] || 0;
      if (lastVal > 0) {
        const diffPercent = ((currentVal - lastVal) / lastVal) * 100;
        categoryComparisons.push({
          category: cat,
          current: currentVal,
          last: lastVal,
          diffPercent: Math.abs(diffPercent),
          isUp: diffPercent > 0,
          icon: currentExpensesByCategory[cat].icon,
        });
      }
    });

    categoryComparisons.sort((a, b) => b.diffPercent - a.diffPercent);

    return {
      totalExpenseCurrent,
      totalIncomeCurrent,
      totalExpenseLast,
      dailyAverage,
      daysPassed,
      topCategory,
      netCashFlow,
      topComparison: categoryComparisons[0] || null,
      hasLastMonthData: totalExpenseLast > 0,
    };
  }, [transactions, currentMonth, currentYear]);

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
      {/* Header Card */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Insight Keuangan Otomatis</h3>
            <p className="text-[11px] text-slate-500">Evaluasi cerdas pola pengeluaran Anda</p>
          </div>
        </div>
        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          Real-time
        </span>
      </div>

      {/* Grid Ringkasan Cerdas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Rata-rata Harian */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Rata-rata Harian</span>
            </div>
            <p className="text-base font-extrabold text-slate-900 tabular-nums">
              {formatRupiah(analysis.dailyAverage)}
            </p>
            <p className="text-[10px] text-slate-500">
              Dihitung dari {analysis.daysPassed} hari berjalan bulan ini
            </p>
          </div>
        </div>

        {/* Arus Kas Bersih */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
              {analysis.netCashFlow >= 0 ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              )}
              <span>Arus Kas (Cash Flow)</span>
            </div>
            <p
              className={`text-base font-extrabold tabular-nums ${
                analysis.netCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {analysis.netCashFlow >= 0 ? '+' : ''}
              {formatRupiah(analysis.netCashFlow)}
            </p>
            <p className="text-[10px] text-slate-500">
              {analysis.netCashFlow >= 0
                ? 'Pemasukan lebih besar dari belanja (Surplus)'
                : 'Pengeluaran melebihi pemasukan bulan ini'}
            </p>
          </div>
        </div>
      </div>

      {/* Kategori Pengeluaran Terbesar */}
      {analysis.topCategory ? (
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                backgroundColor: `${analysis.topCategory.color || '#F43F5E'}1A`,
                color: analysis.topCategory.color || '#F43F5E',
              }}
            >
              <CategoryIcon name={analysis.topCategory.icon} className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Kategori Belanja Terbesar</p>
              <h4 className="text-xs font-bold text-slate-900">{analysis.topCategory.name}</h4>
              <p className="text-[10px] text-slate-500">
                Menyerap {analysis.topCategory.percent.toFixed(0)}% dari total pengeluaran bulan ini
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-extrabold text-slate-900 tabular-nums">
              {formatRupiah(analysis.topCategory.total)}
            </p>
          </div>
        </div>
      ) : null}

      {/* Perbandingan Bulan Lalu (Bila ada) */}
      {analysis.topComparison ? (
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              {analysis.topComparison.isUp ? (
                <TrendingUp className="w-4 h-4 text-rose-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-emerald-600" />
              )}
              <span>Tren Pengeluaran {analysis.topComparison.category}</span>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                analysis.topComparison.isUp
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {analysis.topComparison.isUp ? '+' : '-'}
              {analysis.topComparison.diffPercent.toFixed(0)}%
            </span>
          </div>
          <p className="text-slate-600 leading-relaxed text-[11px]">
            Pengeluaran kategori ini {analysis.topComparison.isUp ? 'naik' : 'turun'} sebesar{' '}
            <span className="font-semibold text-slate-900">
              {analysis.topComparison.diffPercent.toFixed(0)}%
            </span>{' '}
            dibandingkan bulan lalu ({formatRupiah(analysis.topComparison.current)} vs{' '}
            {formatRupiah(analysis.topComparison.last)}).
          </p>
        </div>
      ) : null}

      {/* Target Tabungan Motivation Card */}
      {savings.length > 0 && (
        <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 text-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-emerald-900 block">Kesehatan Impian & Tabungan</span>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              Anda memiliki {savings.length} target impian aktif. Pertahankan konsistensi setoran bulanan untuk mencapai target tepat waktu.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
