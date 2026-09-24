'use client';

import React from 'react';
import { TransaksiRutin, db, recalculateAccountBalance } from '@/lib/db';
import { formatRupiah, toInputDateFormat } from '@/lib/utils/format';
import { Bell, X } from 'lucide-react';

interface RecurringReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  dueItems: TransaksiRutin[];
  onRefresh: () => void;
}

export default function RecurringReminderModal({
  isOpen,
  onClose,
  dueItems,
  onRefresh,
}: RecurringReminderModalProps) {
  if (!isOpen || dueItems.length === 0) return null;

  const handleExecute = async (item: TransaksiRutin) => {
    if (!item.id) return;
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
    } catch (err) {
      console.error(err);
    }
  };

  const handleExecuteAll = async () => {
    for (const item of dueItems) {
      await handleExecute(item);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white border border-amber-200 rounded-3xl p-5 shadow-2xl space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <Bell className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900">Tagihan Jatuh Tempo</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-500">
          Ada {dueItems.length} transaksi rutin yang jatuh tempo bulan ini dan belum dicatat:
        </p>

        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {dueItems.map((item) => (
            <div
              key={item.id}
              className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-bold text-slate-900">{item.keterangan}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Tiap tgl {item.tanggal_setiap_bulan} • {item.akun?.nama}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`text-xs font-bold tabular-nums ${
                    item.tipe === 'pengeluaran' ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {item.tipe === 'pengeluaran' ? '-' : '+'}
                  {formatRupiah(item.jumlah)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 bg-slate-50 border border-slate-200 rounded-2xl transition-colors"
          >
            Tunda Nanti
          </button>
          <button
            type="button"
            onClick={handleExecuteAll}
            className="flex-1 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-2xl shadow-md shadow-emerald-600/20 transition-all"
          >
            Catat Semua Sekarang
          </button>
        </div>
      </div>
    </div>
  );
}
