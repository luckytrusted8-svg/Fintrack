'use client';

import React, { useMemo } from 'react';
import { Akun, Transaksi, Kategori, Tabungan, Anggaran } from '@/lib/db';
import { formatRupiah, getNamaBulan } from '@/lib/utils/format';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  PlusCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from 'recharts';
import CategoryIcon from '@/components/categories/CategoryIcon';
import AccountIcon from '@/components/accounts/AccountIcon';

interface DashboardOverviewProps {
  accounts: Akun[];
  transactions: Transaksi[];
  categories: Kategori[];
  savings: Tabungan[];
  budgets?: Anggaran[];
  selectedMonth: number;
  selectedYear: number;
  onMonthChange: (month: number, year: number) => void;
  onQuickAdd: () => void;
  onManageAccounts: () => void;
  onNavigateToBudget?: () => void;
  loading: boolean;
}

const CATEGORY_COLORS = [
  '#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6',
  '#06B6D4', '#F43F5E', '#14B8A6', '#6366F1', '#EAB308',
];

export default function DashboardOverview({
  accounts,
  transactions,
  categories,
  savings,
  budgets = [],
  selectedMonth,
  selectedYear,
  onMonthChange,
  onQuickAdd,
  onManageAccounts,
  onNavigateToBudget,
  loading,
}: DashboardOverviewProps) {
  // 1. Total Saldo Akumulatif
  const totalSaldoSemuaAkun = useMemo(() => {
    return accounts.reduce((acc, curr) => acc + Number(curr.saldo_sekarang || 0), 0);
  }, [accounts]);

  // 2. Filter transaksi bulan & tahun terpilih
  const currentMonthTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (!t.tanggal) return false;
      if (t.tanggal.includes('-')) {
        const [yStr, mStr] = t.tanggal.split('-');
        const y = parseInt(yStr, 10);
        const m = parseInt(mStr, 10);
        if (y && m) {
          return m === selectedMonth && y === selectedYear;
        }
      }
      const d = new Date(t.tanggal);
      return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [transactions, selectedMonth, selectedYear]);

  // 3. Total Pemasukan & Pengeluaran
  const totalPemasukanBulanIni = useMemo(() => {
    return currentMonthTransactions
      .filter((t) => t.tipe === 'pemasukan')
      .reduce((acc, curr) => acc + Number(curr.jumlah), 0);
  }, [currentMonthTransactions]);

  const totalPengeluaranBulanIni = useMemo(() => {
    return currentMonthTransactions
      .filter((t) => t.tipe === 'pengeluaran')
      .reduce((acc, curr) => acc + Number(curr.jumlah), 0);
  }, [currentMonthTransactions]);

  // 4. Breakdown Pengeluaran per Kategori (Pie Chart)
  const categoryPieData = useMemo(() => {
    const expenseTrx = currentMonthTransactions.filter((t) => t.tipe === 'pengeluaran');
    const groupMap: Record<string, { total: number; icon?: string; color: string }> = {};

    expenseTrx.forEach((trx) => {
      const catName = trx.kategori?.nama || 'Lain-lain';
      if (!groupMap[catName]) {
        groupMap[catName] = {
          total: 0,
          icon: trx.kategori?.icon,
          color: trx.kategori?.warna_hex || CATEGORY_COLORS[Object.keys(groupMap).length % CATEGORY_COLORS.length],
        };
      }
      groupMap[catName].total += Number(trx.jumlah);
    });

    return Object.entries(groupMap)
      .map(([name, data]) => ({
        name,
        value: data.total,
        icon: data.icon,
        color: data.color,
      }))
      .sort((a, b) => b.value - a.value);
  }, [currentMonthTransactions]);

  // 5. Tren Bulanan Jan - Des Tahun Terpilih (Bar Chart)
  const monthlyTrendData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const result = monthNames.map((name, index) => ({
      month: name,
      pemasukan: 0,
      pengeluaran: 0,
    }));

    transactions.forEach((trx) => {
      const d = new Date(trx.tanggal);
      if (d.getFullYear() === selectedYear) {
        const m = d.getMonth();
        if (trx.tipe === 'pemasukan') {
          result[m].pemasukan += Number(trx.jumlah);
        } else if (trx.tipe === 'pengeluaran') {
          result[m].pengeluaran += Number(trx.jumlah);
        }
      }
    });

    return result;
  }, [transactions, selectedYear]);

  // 6. Notifikasi Alert Anggaran
  const budgetAlerts = useMemo(() => {
    if (!budgets || budgets.length === 0) return [];
    const expenseMap: Record<string, number> = {};
    currentMonthTransactions.forEach((t) => {
      if (t.tipe === 'pengeluaran' && t.kategori_id) {
        expenseMap[t.kategori_id] = (expenseMap[t.kategori_id] || 0) + Number(t.jumlah);
      }
    });

    return budgets
      .map((b) => {
        const spent = expenseMap[b.kategori_id] || 0;
        const limit = Number(b.nominal_limit);
        const percent = limit > 0 ? (spent / limit) * 100 : 0;
        return {
          ...b,
          spent,
          percent,
          isOver: percent >= 100,
          isWarning: percent >= 80 && percent < 100,
        };
      })
      .filter((b) => b.isOver || b.isWarning);
  }, [budgets, currentMonthTransactions]);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      onMonthChange(12, selectedYear - 1);
    } else {
      onMonthChange(selectedMonth - 1, selectedYear);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      onMonthChange(1, selectedYear + 1);
    } else {
      onMonthChange(selectedMonth + 1, selectedYear);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 bg-slate-200 rounded-3xl" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 bg-slate-200 rounded-2xl" />
          <div className="h-24 bg-slate-200 rounded-2xl" />
        </div>
        <div className="h-48 bg-slate-200 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Month & Year Filter Bar */}
      <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-xs">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          aria-label="Bulan sebelumnya"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-bold text-slate-900">
            {getNamaBulan(selectedMonth)} {selectedYear}
          </span>
        </div>
        <button
          type="button"
          onClick={handleNextMonth}
          className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          aria-label="Bulan berikutnya"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Banner Peringatan Over-Budget di Dashboard */}
      {budgetAlerts.length > 0 && (
        <div className="space-y-2">
          {budgetAlerts.map((alert) => (
            <div
              key={alert.id}
              onClick={onNavigateToBudget}
              className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] ${
                alert.isOver
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {alert.isOver ? (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                )}
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    {alert.isOver ? 'Melebihi Batas Anggaran' : 'Mendekati Limit Anggaran'}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Kategori <span className="font-semibold text-slate-900">{alert.kategori?.nama}</span> telah terpakai{' '}
                    <span className="font-bold">{alert.percent.toFixed(0)}%</span> ({formatRupiah(alert.spent)} dari{' '}
                    {formatRupiah(alert.nominal_limit)}).
                  </p>
                </div>
              </div>
              <span className="text-[11px] underline font-semibold shrink-0 ml-2 text-emerald-700">Lihat</span>
            </div>
          ))}
        </div>
      )}

      {/* Main Total Balance Card */}
      <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-emerald-600" />
            Total Saldo Seluruh Dompet
          </span>
          <button
            type="button"
            onClick={onManageAccounts}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold hover:underline"
          >
            Kelola
          </button>
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
          {formatRupiah(totalSaldoSemuaAkun)}
        </h2>

        {/* Horizontal Accounts Mini-scroll */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2.5 overflow-x-auto no-scrollbar">
          {accounts.length === 0 ? (
            <button
              type="button"
              onClick={onManageAccounts}
              className="text-xs text-slate-600 hover:text-emerald-600 flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-50 border border-dashed border-slate-300"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tambah Dompet Baru</span>
            </button>
          ) : (
            accounts.map((acc) => (
              <div
                key={acc.id}
                className="shrink-0 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 min-w-30"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: `${acc.warna_hex || '#10B981'}20`,
                      color: acc.warna_hex || '#10B981',
                    }}
                  >
                    <AccountIcon name={acc.icon} jenis={acc.jenis} className="w-3 h-3" />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-700 truncate">
                    {acc.nama}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-900 tabular-nums">
                  {formatRupiah(acc.saldo_sekarang)}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Income & Expense Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-slate-600">Pemasukan</span>
          </div>
          <p className="text-base font-extrabold text-emerald-600 tabular-nums">
            {formatRupiah(totalPemasukanBulanIni)}
          </p>
          <span className="text-[10px] text-slate-400">Bulan {getNamaBulan(selectedMonth)}</span>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-slate-600">Pengeluaran</span>
          </div>
          <p className="text-base font-extrabold text-rose-600 tabular-nums">
            {formatRupiah(totalPengeluaranBulanIni)}
          </p>
          <span className="text-[10px] text-slate-400">Bulan {getNamaBulan(selectedMonth)}</span>
        </div>
      </div>

      {/* Breakdown Pengeluaran per Kategori (Pie Chart) */}
      <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900">
            Pengeluaran per Kategori
          </h3>
          <span className="text-[10px] text-slate-500 font-medium">Bulan Ini</span>
        </div>

        {categoryPieData.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-slate-500">Belum ada pengeluaran di {getNamaBulan(selectedMonth)} {selectedYear}.</p>
            <button
              type="button"
              onClick={onQuickAdd}
              className="mt-3 text-xs text-emerald-600 font-semibold hover:underline"
            >
              Catat pengeluaran pertamamu
            </button>
          </div>
        ) : (
          <div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => formatRupiah(Number(val))}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E2E8F0',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#0F172A',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* List with CategoryIcon */}
            <div className="space-y-2 mt-3">
              {categoryPieData.map((item) => {
                const percentage = totalPengeluaranBulanIni > 0 
                  ? ((item.value / totalPengeluaranBulanIni) * 100).toFixed(0) 
                  : 0;
                return (
                  <div key={item.name} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2.5 truncate">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${item.color}20`, color: item.color }}
                      >
                        <CategoryIcon name={item.icon} className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-semibold text-slate-800 truncate">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-extrabold text-slate-900 tabular-nums">
                        {formatRupiah(item.value)}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        {percentage}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Tren Pengeluaran Bulanan (Bar Chart Jan - Des) */}
      <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900">
            Tren Arus Kas Tahun {selectedYear}
          </h3>
          <span className="text-[10px] text-slate-500 font-medium">Jan - Des</span>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyTrendData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
              <XAxis dataKey="month" stroke="#94A3B8" fontSize={10} tickLine={false} />
              <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} tickFormatter={(val) => `${val / 1000}k`} />
              <Tooltip
                formatter={(val) => formatRupiah(Number(val))}
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E2E8F0',
                  borderRadius: '12px',
                  fontSize: '11px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
              />
              <Bar dataKey="pemasukan" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pengeluaran" fill="#F43F5E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
