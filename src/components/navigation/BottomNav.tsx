'use client';

import React from 'react';
import { Home, Receipt, Plus, PieChart, Wallet } from 'lucide-react';

export type TabType = 'beranda' | 'transaksi' | 'anggaran' | 'akun';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onQuickAdd: () => void;
}

export default function BottomNav({ activeTab, onTabChange, onQuickAdd }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between relative safe-bottom">
        {/* Tab Beranda */}
        <button
          id="nav-beranda"
          type="button"
          onClick={() => onTabChange('beranda')}
          className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[44px] transition-colors ${
            activeTab === 'beranda'
              ? 'text-emerald-600 font-semibold'
              : 'text-slate-400 hover:text-slate-700'
          }`}
          aria-label="Halaman Beranda"
        >
          <Home className="w-5 h-5" />
          <span className="text-[11px] mt-1">Beranda</span>
        </button>

        {/* Tab Transaksi */}
        <button
          id="nav-transaksi"
          type="button"
          onClick={() => onTabChange('transaksi')}
          className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[44px] transition-colors ${
            activeTab === 'transaksi'
              ? 'text-emerald-600 font-semibold'
              : 'text-slate-400 hover:text-slate-700'
          }`}
          aria-label="Daftar Histori Transaksi"
        >
          <Receipt className="w-5 h-5" />
          <span className="text-[11px] mt-1">Transaksi</span>
        </button>

        {/* Center Quick Add Button (Floating Action) */}
        <div className="flex-1 flex justify-center -mt-5">
          <button
            id="btn-quick-add"
            type="button"
            onClick={onQuickAdd}
            className="w-13 h-13 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 active:scale-95 transition-transform"
            aria-label="Catat Transaksi Cepat"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Tab Anggaran & Tabungan */}
        <button
          id="nav-anggaran"
          type="button"
          onClick={() => onTabChange('anggaran')}
          className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[44px] transition-colors ${
            activeTab === 'anggaran'
              ? 'text-emerald-600 font-semibold'
              : 'text-slate-400 hover:text-slate-700'
          }`}
          aria-label="Anggaran dan Target Tabungan"
        >
          <PieChart className="w-5 h-5" />
          <span className="text-[11px] mt-1">Rencana</span>
        </button>

        {/* Tab Akun & Dompet */}
        <button
          id="nav-akun"
          type="button"
          onClick={() => onTabChange('akun')}
          className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[44px] transition-colors ${
            activeTab === 'akun'
              ? 'text-emerald-600 font-semibold'
              : 'text-slate-400 hover:text-slate-700'
          }`}
          aria-label="Kelola Akun dan Dompet"
        >
          <Wallet className="w-5 h-5" />
          <span className="text-[11px] mt-1">Dompet</span>
        </button>
      </div>
    </div>
  );
}
