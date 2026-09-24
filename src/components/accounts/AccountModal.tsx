'use client';

import React, { useState } from 'react';
import { Akun, JenisAkun, db, recalculateAccountBalance, recalculateAllAccountBalances } from '@/lib/db';
import { formatRupiah, toInputDateFormat } from '@/lib/utils/format';
import { X, Plus, ArrowRightLeft, Wallet, Check, AlertCircle, Loader2, Edit2, Trash2 } from 'lucide-react';
import AccountIcon, { ACCOUNT_ICON_OPTIONS, ACCOUNT_TYPE_ICONS } from './AccountIcon';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Akun[];
  onSuccess: () => void;
}

const COLOR_PRESETS = [
  '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#06B6D4', '#64748B',
];

const DEFAULT_ICON_FOR_TYPE: Record<JenisAkun, string> = {
  cash: 'banknote',
  bank: 'building-2',
  ewallet: 'smartphone',
  investasi: 'trending-up',
  lainnya: 'wallet',
};

export default function AccountModal({
  isOpen,
  onClose,
  accounts,
  onSuccess,
}: AccountModalProps) {
  const [activeView, setActiveView] = useState<'list' | 'add' | 'transfer' | 'edit'>('list');
  const [editingAccount, setEditingAccount] = useState<Akun | null>(null);

  // State Form Tambah & Edit Akun
  const [namaAkun, setNamaAkun] = useState('');
  const [jenisAkun, setJenisAkun] = useState<JenisAkun>('cash');
  const [selectedIcon, setSelectedIcon] = useState('banknote');
  const [saldoAwal, setSaldoAwal] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0]);

  // State Form Transfer
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferKeterangan, setTransferKeterangan] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const startEdit = (acc: Akun) => {
    setEditingAccount(acc);
    setNamaAkun(acc.nama);
    setJenisAkun(acc.jenis);
    setSelectedIcon(acc.icon || DEFAULT_ICON_FOR_TYPE[acc.jenis] || 'wallet');
    setSaldoAwal(acc.saldo_awal.toString());
    setSelectedColor(acc.warna_hex || COLOR_PRESETS[0]);
    setActiveView('edit');
    setErrorMsg(null);
  };

  const handleJenisChange = (newJenis: JenisAkun) => {
    setJenisAkun(newJenis);
    setSelectedIcon(DEFAULT_ICON_FOR_TYPE[newJenis] || 'wallet');
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaAkun.trim()) {
      setErrorMsg('Nama akun wajib diisi.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const nominalSaldoAwal = parseFloat(saldoAwal.replace(/\D/g, '')) || 0;

    try {
      const now = new Date().toISOString();

      if (editingAccount?.id) {
        await db.akun.update(editingAccount.id, {
          nama: namaAkun.trim(),
          jenis: jenisAkun,
          icon: selectedIcon,
          saldo_awal: nominalSaldoAwal,
          warna_hex: selectedColor,
          updated_at: now,
        });
      } else {
        await db.akun.add({
          nama: namaAkun.trim(),
          jenis: jenisAkun,
          icon: selectedIcon,
          saldo_awal: nominalSaldoAwal,
          saldo_sekarang: nominalSaldoAwal,
          warna_hex: selectedColor,
          is_active: true,
          created_at: now,
          updated_at: now,
        });
      }

      await recalculateAllAccountBalances();

      setNamaAkun('');
      setSaldoAwal('');
      setEditingAccount(null);
      setActiveView('list');
      onSuccess();
    } catch {
      setErrorMsg('Gagal menyimpan akun.');
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const nominal = parseFloat(transferAmount.replace(/\D/g, '')) || 0;
    if (nominal <= 0) {
      setErrorMsg('Masukkan nominal transfer.');
      return;
    }
    if (!fromAccountId || !toAccountId) {
      setErrorMsg('Pilih akun asal dan akun tujuan.');
      return;
    }
    if (fromAccountId === toAccountId) {
      setErrorMsg('Akun asal dan akun tujuan tidak boleh sama.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const now = new Date().toISOString();
      await db.transaksi.add({
        akun_id: fromAccountId,
        target_akun_id: toAccountId,
        tipe: 'transfer',
        jumlah: nominal,
        tanggal: toInputDateFormat(),
        keterangan: transferKeterangan.trim() || undefined,
        created_at: now,
        updated_at: now,
      });

      await recalculateAllAccountBalances();

      setTransferAmount('');
      setTransferKeterangan('');
      setActiveView('list');
      onSuccess();
    } catch {
      setErrorMsg('Gagal memproses transfer.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (id?: string) => {
    if (!id) return;
    if (!confirm('Yakin ingin menghapus akun ini?')) return;

    try {
      await db.akun.delete(id);
      await recalculateAllAccountBalances();
      onSuccess();
    } catch {
      setErrorMsg('Gagal menghapus akun.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-5 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {activeView === 'list' && 'Daftar Akun Dompet'}
              {activeView === 'add' && 'Tambah Akun Baru'}
              {activeView === 'edit' && 'Edit Akun Dompet'}
              {activeView === 'transfer' && 'Pindah Dana / Transfer'}
            </h3>
            <p className="text-xs text-slate-500">
              {activeView === 'list' && `${accounts.length} dompet tersimpan`}
              {activeView === 'add' && 'Tambahkan rekening atau kas harian'}
              {activeView === 'edit' && 'Perbarui nama, ikon, atau saldo awal'}
              {activeView === 'transfer' && 'Mutasi antar rekening & dompet'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-3 p-2.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="overflow-y-auto py-3 flex-1 pr-1">
          {activeView === 'list' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setEditingAccount(null);
                    setNamaAkun('');
                    setSaldoAwal('');
                    setJenisAkun('cash');
                    setSelectedIcon('banknote');
                    setActiveView('add');
                  }}
                  className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-2xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Akun</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setActiveView('transfer');
                  }}
                  className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-2xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ArrowRightLeft className="w-4 h-4 text-sky-600" />
                  <span>Transfer Saldo</span>
                </button>
              </div>

              {accounts.length === 0 ? (
                <div className="text-center py-8 px-4 border border-dashed border-slate-300 rounded-3xl">
                  <Wallet className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-900">Belum ada akun dompet</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Buat akun pertamamu (misal: Dompet Tunai, BCA, atau GoPay) untuk mulai mencatat.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {accounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
                          style={{
                            backgroundColor: `${acc.warna_hex || '#10B981'}15`,
                            color: acc.warna_hex || '#10B981',
                          }}
                        >
                          <AccountIcon name={acc.icon} jenis={acc.jenis} className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{acc.nama}</p>
                          <p className="text-[10px] text-slate-500 capitalize">{acc.jenis}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs font-extrabold text-slate-900 tabular-nums">
                            {formatRupiah(acc.saldo_sekarang)}
                          </p>
                          <p className="text-[10px] text-slate-400">Saldo Terkini</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(acc)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                            title="Edit akun"
                            aria-label={`Edit ${acc.nama}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAccount(acc.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                            title="Hapus akun"
                            aria-label={`Hapus ${acc.nama}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {(activeView === 'add' || activeView === 'edit') && (
            <form onSubmit={handleSaveAccount} className="space-y-4">
              {/* Pratinjau Tampilan Akun */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Pratinjau Akun
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    {namaAkun || 'Nama Akun / Rekening'}
                  </span>
                  <span className="text-[10px] text-slate-500 block capitalize">{jenisAkun}</span>
                </div>
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-xs transition-colors"
                  style={{
                    backgroundColor: `${selectedColor}18`,
                    color: selectedColor,
                  }}
                >
                  <AccountIcon name={selectedIcon} jenis={jenisAkun} className="w-5 h-5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Akun</label>
                <input
                  type="text"
                  value={namaAkun}
                  onChange={(e) => setNamaAkun(e.target.value)}
                  placeholder="Contoh: Dompet Tunai / Rekening BCA"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Akun</label>
                <select
                  value={jenisAkun}
                  onChange={(e) => handleJenisChange(e.target.value as JenisAkun)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  <option value="cash">Uang Tunai (Cash)</option>
                  <option value="bank">Rekening Bank</option>
                  <option value="ewallet">E-Wallet (GoPay, OVO, Dana)</option>
                  <option value="investasi">Investasi</option>
                  <option value="lainnya">Lainnya</option>
                </select>
              </div>

              {/* Pemilih Ikon React */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Pilih Ikon Akun
                </label>
                <div className="grid grid-cols-6 gap-2 p-2 bg-slate-50 rounded-2xl border border-slate-200 max-h-32 overflow-y-auto">
                  {ACCOUNT_ICON_OPTIONS.map((opt) => {
                    const isSelected = selectedIcon === opt.name;
                    return (
                      <button
                        key={opt.name}
                        type="button"
                        onClick={() => setSelectedIcon(opt.name)}
                        title={opt.label}
                        className={`p-2.5 rounded-xl flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-xs scale-105'
                            : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/70'
                        }`}
                      >
                        <AccountIcon name={opt.name} className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Saldo Awal</label>
                <input
                  type="text"
                  value={saldoAwal ? formatRupiah(parseFloat(saldoAwal.replace(/\D/g, ''))) : ''}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setSaldoAwal(raw);
                  }}
                  placeholder="Rp 0"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500 tabular-nums"
                />
              </div>

              {/* Warna Penanda dengan Tombol Kotak Halus */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Warna Penanda</label>
                <div className="flex gap-2">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform hover:scale-105 shadow-xs"
                      style={{ backgroundColor: color }}
                    >
                      {selectedColor === color && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveView('list')}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-2xl transition-colors"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-2xl flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Akun'}
                </button>
              </div>
            </form>
          )}

          {activeView === 'transfer' && (
            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Dari Akun (Asal)</label>
                <select
                  value={fromAccountId}
                  onChange={(e) => setFromAccountId(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Pilih akun sumber...</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.nama} ({formatRupiah(acc.saldo_sekarang)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ke Akun (Tujuan)</label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Pilih akun tujuan...</option>
                  {accounts
                    .filter((acc) => acc.id?.toString() !== fromAccountId)
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.nama} ({formatRupiah(acc.saldo_sekarang)})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nominal Transfer</label>
                <input
                  type="text"
                  value={transferAmount ? formatRupiah(parseFloat(transferAmount.replace(/\D/g, ''))) : ''}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setTransferAmount(raw);
                  }}
                  placeholder="Rp 0"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500 tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan (Opsional)</label>
                <input
                  type="text"
                  value={transferKeterangan}
                  onChange={(e) => setTransferKeterangan(e.target.value)}
                  placeholder="Contoh: Tarik tunai ATM"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveView('list')}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-2xl transition-colors"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-2xl flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Kirim Transfer'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
