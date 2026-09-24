'use client';

import React, { useState, useRef } from 'react';
import { Tabungan, Akun, db, recalculateAccountBalance } from '@/lib/db';
import { formatRupiah, toInputDateFormat } from '@/lib/utils/format';
import { compressImageToBase64 } from '@/lib/utils/image';
import {
  PiggyBank,
  Plus,
  Target,
  Camera,
  X,
  PlusCircle,
  ArrowDownLeft,
  Loader2,
  Trash2,
} from 'lucide-react';

interface SavingsSectionProps {
  savings: Tabungan[];
  accounts: Akun[];
  onRefresh: () => void;
  loading: boolean;
}

export default function SavingsSection({
  savings,
  accounts,
  onRefresh,
  loading,
}: SavingsSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Tabungan | null>(null);

  // Form State Tambah Target
  const [namaTarget, setNamaTarget] = useState('');
  const [targetNominal, setTargetNominal] = useState('');
  const [targetTanggal, setTargetTanggal] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [goalPhotoPreview, setGoalPhotoPreview] = useState<string | null>(null);

  // Form State Setor Tabungan
  const [depositAmount, setDepositAmount] = useState('');
  const [depositAccountId, setDepositAccountId] = useState(accounts[0]?.id?.toString() || '');

  // Form State Tarik Tabungan
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAccountId, setWithdrawAccountId] = useState(accounts[0]?.id?.toString() || '');

  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const nominal = parseFloat(targetNominal.replace(/\D/g, '')) || 0;
    if (nominal <= 0 || !namaTarget.trim()) return;

    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      await db.tabungan.add({
        nama_target: namaTarget.trim(),
        target_nominal: nominal,
        terkumpul: 0,
        target_tanggal: targetTanggal || undefined,
        keterangan: keterangan.trim() || undefined,
        foto_url: goalPhotoPreview || undefined,
        created_at: now,
        updated_at: now,
      });

      setNamaTarget('');
      setTargetNominal('');
      setTargetTanggal('');
      setKeterangan('');
      setGoalPhotoPreview(null);
      setIsModalOpen(false);
      onRefresh();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal || !depositAccountId) return;
    const amount = parseFloat(depositAmount.replace(/\D/g, '')) || 0;
    if (amount <= 0) return;

    setSubmitting(true);
    try {
      const now = new Date().toISOString();

      await db.transaksi.add({
        akun_id: depositAccountId,
        tipe: 'pengeluaran',
        jumlah: amount,
        tanggal: toInputDateFormat(),
        keterangan: `Setor Tabungan: ${selectedGoal.nama_target}`,
        created_at: now,
        updated_at: now,
      });

      await recalculateAccountBalance(depositAccountId);

      const newTerkumpul = Number(selectedGoal.terkumpul || 0) + amount;
      if (selectedGoal.id) {
        await db.tabungan.update(selectedGoal.id, {
          terkumpul: newTerkumpul,
          updated_at: now,
        });
      }

      setDepositAmount('');
      setIsDepositModalOpen(false);
      setSelectedGoal(null);
      onRefresh();
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal || !withdrawAccountId) return;
    const amount = parseFloat(withdrawAmount.replace(/\D/g, '')) || 0;
    const terkumpul = Number(selectedGoal.terkumpul || 0);

    if (amount <= 0 || amount > terkumpul) {
      alert('Nominal penarikan tidak boleh melebihi saldo tabungan terkumpul.');
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date().toISOString();

      await db.transaksi.add({
        akun_id: withdrawAccountId,
        tipe: 'pemasukan',
        jumlah: amount,
        tanggal: toInputDateFormat(),
        keterangan: `Pencairan Tabungan: ${selectedGoal.nama_target}`,
        created_at: now,
        updated_at: now,
      });

      await recalculateAccountBalance(withdrawAccountId);

      const newTerkumpul = Math.max(0, terkumpul - amount);
      if (selectedGoal.id) {
        await db.tabungan.update(selectedGoal.id, {
          terkumpul: newTerkumpul,
          updated_at: now,
        });
      }

      setWithdrawAmount('');
      setIsWithdrawModalOpen(false);
      setSelectedGoal(null);
      onRefresh();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!confirm('Hapus target tabungan ini?')) return;
    await db.tabungan.delete(id);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Target Tabungan</h3>
          <p className="text-[11px] text-slate-500">Wujudkan impian dengan motivasi visual</p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow-md shadow-emerald-600/20 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Target</span>
        </button>
      </div>

      {loading ? (
        <div className="h-32 bg-slate-200 rounded-3xl animate-pulse" />
      ) : savings.length === 0 ? (
        <div className="py-8 px-4 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
          <PiggyBank className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-900">Belum ada target tabungan</p>
          <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
            Pasang target impian Anda (misal: Beli Laptop, Liburan, Dana Darurat) lengkap dengan foto motivasi.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {savings.map((item) => {
            const target = Number(item.target_nominal);
            const terkumpul = Number(item.terkumpul || 0);
            const progress = Math.min(100, (terkumpul / target) * 100);

            return (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-3xl overflow-hidden flex flex-col shadow-xs"
              >
                {/* Visual Motivation Photo */}
                {item.foto_url ? (
                  <div className="relative h-32 w-full bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.foto_url}
                      alt={item.nama_target}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent" />
                  </div>
                ) : (
                  <div className="h-14 bg-linear-to-r from-emerald-50 to-teal-50 p-3 flex items-center justify-between border-b border-slate-100">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <Target className="w-4 h-4" />
                    </div>
                    <button
                      type="button"
                      onClick={() => item.id && handleDeleteGoal(item.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                      aria-label="Hapus target"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900 truncate">
                        {item.nama_target}
                      </h4>
                      {item.foto_url && (
                        <button
                          type="button"
                          onClick={() => item.id && handleDeleteGoal(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                          aria-label="Hapus target"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {item.target_tanggal && (
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Target: {item.target_tanggal}
                      </p>
                    )}

                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1 tabular-nums">
                        <span className="font-extrabold text-emerald-600">
                          {formatRupiah(terkumpul)}
                        </span>
                        <span className="text-slate-500 font-medium">
                          {formatRupiah(target)}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200/60">
                        <div
                          className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 block text-right font-medium">
                        {progress.toFixed(0)}% tercapai
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedGoal(item);
                        setDepositAccountId(accounts[0]?.id?.toString() || '');
                        setIsDepositModalOpen(true);
                      }}
                      className="flex-1 py-2 px-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold text-emerald-700 rounded-xl flex items-center justify-center gap-1 transition-colors"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Setor</span>
                    </button>
                    {terkumpul > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedGoal(item);
                          setWithdrawAccountId(accounts[0]?.id?.toString() || '');
                          setIsWithdrawModalOpen(true);
                        }}
                        className="flex-1 py-2 px-2 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-xs font-semibold text-sky-700 rounded-xl flex items-center justify-center gap-1 transition-colors"
                      >
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                        <span>Tarik Dana</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Buat Target Tabungan Baru */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Target Tabungan Baru</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-3.5 mt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Target</label>
                <input
                  type="text"
                  value={namaTarget}
                  onChange={(e) => setNamaTarget(e.target.value)}
                  placeholder="Contoh: Beli Laptop / Tabungan Liburan"
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nominal Target</label>
                <input
                  type="text"
                  value={targetNominal ? formatRupiah(parseFloat(targetNominal.replace(/\D/g, ''))) : ''}
                  onChange={(e) => setTargetNominal(e.target.value.replace(/\D/g, ''))}
                  placeholder="Rp 0"
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Tanggal (Opsional)</label>
                <input
                  type="date"
                  value={targetTanggal}
                  onChange={(e) => setTargetTanggal(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Upload Foto Motivasi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Foto Motivasi (Opsional)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    if (e.target.files && e.target.files[0]) {
                      const compressed = await compressImageToBase64(e.target.files[0]);
                      setGoalPhotoPreview(compressed);
                    }
                  }}
                  className="hidden"
                />
                {goalPhotoPreview ? (
                  <div className="relative h-24 rounded-2xl overflow-hidden border border-slate-200">
                    <img src={goalPhotoPreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setGoalPhotoPreview(null)}
                      className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 px-3 bg-slate-50 border border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl flex items-center justify-center gap-1.5 text-xs text-slate-600 transition-colors"
                  >
                    <Camera className="w-4 h-4 text-emerald-600" />
                    <span>Upload Foto Barang Impian</span>
                  </button>
                )}
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
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Target'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Setor Tabungan */}
      {isDepositModalOpen && selectedGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Setor ke {selectedGoal.nama_target}</h3>
              <button
                type="button"
                onClick={() => setIsDepositModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDeposit} className="space-y-3.5 mt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ambil Dari Akun Dompet</label>
                <select
                  value={depositAccountId}
                  onChange={(e) => setDepositAccountId(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.nama} ({formatRupiah(acc.saldo_sekarang)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nominal Setoran</label>
                <input
                  type="text"
                  value={depositAmount ? formatRupiah(parseFloat(depositAmount.replace(/\D/g, ''))) : ''}
                  onChange={(e) => setDepositAmount(e.target.value.replace(/\D/g, ''))}
                  placeholder="Rp 0"
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 tabular-nums"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDepositModalOpen(false)}
                  className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center transition-colors shadow-xs"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Konfirmasi Setoran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tarik / Cairkan Tabungan */}
      {isWithdrawModalOpen && selectedGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Tarik Saldo Tabungan</h3>
                <p className="text-[10px] text-slate-500">
                  Terkumpul saat ini: {formatRupiah(selectedGoal.terkumpul)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsWithdrawModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleWithdraw} className="space-y-3.5 mt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Setor Masuk ke Akun Dompet</label>
                <select
                  value={withdrawAccountId}
                  onChange={(e) => setWithdrawAccountId(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.nama} ({formatRupiah(acc.saldo_sekarang)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nominal yang Ditarik</label>
                <input
                  type="text"
                  value={withdrawAmount ? formatRupiah(parseFloat(withdrawAmount.replace(/\D/g, ''))) : ''}
                  onChange={(e) => setWithdrawAmount(e.target.value.replace(/\D/g, ''))}
                  placeholder="Rp 0"
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 tabular-nums"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 px-3 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center transition-colors shadow-xs"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tarik Sekarang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
