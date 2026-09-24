'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import BottomNav, { TabType } from '@/components/navigation/BottomNav';
import DashboardOverview from '@/components/dashboard/DashboardOverview';
import TransactionHistory from '@/components/transactions/TransactionHistory';
import BudgetSection from '@/components/budget/BudgetSection';
import SavingsSection from '@/components/savings/SavingsSection';
import RecurringSection from '@/components/recurring/RecurringSection';
import FinancialInsights from '@/components/insights/FinancialInsights';
import TransactionFormModal from '@/components/transactions/TransactionFormModal';
import AccountModal from '@/components/accounts/AccountModal';
import ProfileModal from '@/components/profile/ProfileModal';
import CategoryManagementModal from '@/components/categories/CategoryManagementModal';
import RecurringReminderModal from '@/components/recurring/RecurringReminderModal';
import PinLockScreen from '@/components/security/PinLockScreen';
import AccountIcon from '@/components/accounts/AccountIcon';
import {
  db,
  Akun,
  Transaksi,
  Kategori,
  Tabungan,
  Anggaran,
  TransaksiRutin,
  UserProfile,
  initializeDatabaseDefaults,
  recalculateAllAccountBalances,
} from '@/lib/db';
import { Settings, Wallet, ShieldCheck } from 'lucide-react';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabType>('beranda');

  // Modals
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaksi | null>(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isReminderOpen, setIsReminderOpen] = useState(false);

  // Security Lock
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Filter Bulan & Tahun
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());

  // Application Data States
  const [accounts, setAccounts] = useState<Akun[]>([]);
  const [transactions, setTransactions] = useState<Transaksi[]>([]);
  const [categories, setCategories] = useState<Kategori[]>([]);
  const [savings, setSavings] = useState<Tabungan[]>([]);
  const [budgets, setBudgets] = useState<Anggaran[]>([]);
  const [recurring, setRecurring] = useState<TransaksiRutin[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  // Fetch all user data
  const fetchData = useCallback(async () => {
    try {
      // 0. Hitung ulang seluruh saldo secara otomatis dan akurat
      await recalculateAllAccountBalances();

      // 1. Akun
      const akunList = await db.akun.toArray();
      setAccounts(akunList);

      // 2. Kategori
      const katList = await db.kategori.toArray();
      setCategories(katList);

      const akunMap = new Map(akunList.map((a) => [a.id?.toString(), a]));
      const katMap = new Map(katList.map((k) => [k.id?.toString(), k]));

      // 3. Transaksi
      const rawTrx = await db.transaksi.toArray();
      const enrichedTrx: Transaksi[] = rawTrx.map((t) => ({
        ...t,
        akun: akunMap.get(t.akun_id?.toString()),
        target_akun: t.target_akun_id ? akunMap.get(t.target_akun_id.toString()) : undefined,
        kategori: t.kategori_id ? katMap.get(t.kategori_id.toString()) : undefined,
      }));

      enrichedTrx.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
      setTransactions(enrichedTrx);

      // 4. Tabungan
      const tabList = await db.tabungan.toArray();
      tabList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setSavings(tabList);

      // 5. Anggaran
      const angList = await db.anggaran
        .where({ bulan: selectedMonth, tahun: selectedYear })
        .toArray();
      const enrichedAng = angList.map((a) => ({
        ...a,
        kategori: katMap.get(a.kategori_id.toString()),
      }));
      setBudgets(enrichedAng);

      // 6. Transaksi Rutin
      const rutList = await db.transaksi_rutin.toArray();
      const enrichedRut = rutList.map((r) => ({
        ...r,
        akun: akunMap.get(r.akun_id?.toString()),
        kategori: r.kategori_id ? katMap.get(r.kategori_id.toString()) : undefined,
      }));
      setRecurring(enrichedRut);

      // 7. Profile
      const userProfile = await db.user_profile.toCollection().first();
      if (userProfile) {
        setProfile(userProfile);
        if (!userProfile.pin_code) {
          setIsUnlocked(true);
        }
      } else {
        setIsUnlocked(true);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setDataLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      await initializeDatabaseDefaults();
      await fetchData();
    };
    init();
  }, [fetchData]);

  // Deteksi transaksi rutin yang jatuh tempo bulan ini
  const dueRecurringItems = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonthNum = today.getMonth() + 1;
    const currentYearNum = today.getFullYear();

    return recurring.filter((item) => {
      if (!item.is_active) return false;
      if (item.terakhir_dijalankan) {
        const lastRun = new Date(item.terakhir_dijalankan);
        if (
          lastRun.getMonth() + 1 === currentMonthNum &&
          lastRun.getFullYear() === currentYearNum
        ) {
          return false;
        }
      }
      return currentDay >= item.tanggal_setiap_bulan;
    });
  }, [recurring]);

  // Tampilkan reminder saat aplikasi pertama kali terbuka jika ada tagihan jatuh tempo
  useEffect(() => {
    if (!dataLoading && isUnlocked && dueRecurringItems.length > 0) {
      const timer = setTimeout(() => {
        setIsReminderOpen(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [dataLoading, isUnlocked, dueRecurringItems.length]);

  // Tampilkan layar kunci PIN jika aktif dan belum dibuka
  if (!isUnlocked && profile?.pin_code) {
    return (
      <PinLockScreen
        correctPin={profile.pin_code}
        onUnlocked={() => setIsUnlocked(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      {/* Mobile-First Header Bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs safe-top">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 relative">
              <Image
                src="/logo.png"
                alt="Fintrack Logo"
                width={32}
                height={32}
                priority
                className="rounded-xl shadow-xs"
              />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 tracking-tight">Fintrack</h1>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500 font-medium">
                  {profile?.nama_lengkap || 'Pengguna Fintrack'}
                </span>
                <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  Offline DB
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsProfileModalOpen(true)}
              title="Pengaturan & Backup"
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              aria-label="Pengaturan"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area with generous bottom padding for Floating Bottom Nav */}
      <main className="max-w-md mx-auto px-4 pt-4 pb-32">
        {activeTab === 'beranda' && (
          <div className="space-y-4">
            <DashboardOverview
              accounts={accounts}
              transactions={transactions}
              categories={categories}
              savings={savings}
              budgets={budgets}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onMonthChange={(m, y) => {
                setSelectedMonth(m);
                setSelectedYear(y);
              }}
              onQuickAdd={() => {
                setEditingTransaction(null);
                setIsQuickAddOpen(true);
              }}
              onManageAccounts={() => setIsAccountModalOpen(true)}
              onNavigateToBudget={() => setActiveTab('anggaran')}
              loading={dataLoading}
            />
            <FinancialInsights
              transactions={transactions}
              savings={savings}
              budgets={budgets}
              currentMonth={selectedMonth}
              currentYear={selectedYear}
            />
          </div>
        )}

        {activeTab === 'transaksi' && (
          <TransactionHistory
            transactions={transactions}
            accounts={accounts}
            categories={categories}
            onRefresh={fetchData}
            loading={dataLoading}
            onEditTransaction={(trx) => {
              setEditingTransaction(trx);
              setIsQuickAddOpen(true);
            }}
          />
        )}

        {activeTab === 'anggaran' && (
          <div className="space-y-6">
            <BudgetSection
              budgets={budgets}
              categories={categories}
              transactions={transactions}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onRefresh={fetchData}
              loading={dataLoading}
            />
            <div className="pt-2 border-t border-slate-200">
              <SavingsSection
                savings={savings}
                accounts={accounts}
                onRefresh={fetchData}
                loading={dataLoading}
              />
            </div>
            <div className="pt-2 border-t border-slate-200">
              <RecurringSection
                recurringList={recurring}
                accounts={accounts}
                categories={categories}
                onRefresh={fetchData}
                loading={dataLoading}
              />
            </div>
          </div>
        )}

        {activeTab === 'akun' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Dompet & Rekening</h2>
                <p className="text-xs text-slate-500">Daftar sumber dana dan transfer saldo</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAccountModalOpen(true)}
                className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow-md shadow-emerald-600/20 transition-all"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Kelola Dompet</span>
              </button>
            </div>

            {/* List Akun */}
            <div className="space-y-2">
              {accounts.length === 0 ? (
                <div className="p-8 text-center bg-white border border-dashed border-slate-300 rounded-3xl shadow-sm">
                  <Wallet className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-900">Belum ada akun dompet</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    Tambahkan dompet tunai atau rekening bank untuk mulai mencatat keuangan harian.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsAccountModalOpen(true)}
                    className="mt-4 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                  >
                    Tambah Dompet Sekarang
                  </button>
                </div>
              ) : (
                accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="p-4 bg-white border border-slate-200 rounded-3xl flex items-center justify-between shadow-xs"
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
                        style={{
                          backgroundColor: `${acc.warna_hex || '#10B981'}15`,
                          color: acc.warna_hex || '#10B981',
                        }}
                      >
                        <AccountIcon name={acc.icon} jenis={acc.jenis} className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{acc.nama}</h3>
                        <p className="text-[11px] text-slate-500 capitalize">{acc.jenis}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-slate-900 tabular-nums">
                        Rp {Number(acc.saldo_sekarang || 0).toLocaleString('id-ID')}
                      </p>
                      <p className="text-[10px] text-slate-400">Saldo Terkini</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* Floating Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        onQuickAdd={() => {
          setEditingTransaction(null);
          setIsQuickAddOpen(true);
        }}
      />

      {/* Quick-Add & Edit Transaction Modal */}
      <TransactionFormModal
        isOpen={isQuickAddOpen}
        onClose={() => {
          setIsQuickAddOpen(false);
          setEditingTransaction(null);
        }}
        accounts={accounts}
        categories={categories}
        onSuccess={fetchData}
        initialData={editingTransaction}
        onAddAccountRequest={() => {
          setIsQuickAddOpen(false);
          setIsAccountModalOpen(true);
        }}
      />

      {/* Account & Transfer Modal */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        accounts={accounts}
        onSuccess={fetchData}
      />

      {/* Profile & Backup Settings Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={profile}
        onRefresh={fetchData}
        onOpenCategories={() => setIsCategoryModalOpen(true)}
      />

      {/* Category Management CRUD Modal */}
      <CategoryManagementModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        onRefresh={fetchData}
      />

      {/* Auto-Reminder Recurring Modal */}
      <RecurringReminderModal
        isOpen={isReminderOpen}
        onClose={() => setIsReminderOpen(false)}
        dueItems={dueRecurringItems}
        onRefresh={fetchData}
      />
    </div>
  );
}
