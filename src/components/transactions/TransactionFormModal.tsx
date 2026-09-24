'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Akun, Kategori, JenisTransaksi, Transaksi, db, recalculateAllAccountBalances } from '@/lib/db';
import { formatRupiah, toInputDateFormat } from '@/lib/utils/format';
import { compressImageToBase64 } from '@/lib/utils/image';
import { X, Camera, Image as ImageIcon, Loader2, AlertCircle, Plus } from 'lucide-react';
import CategoryIcon, { CATEGORY_ICON_LIST } from '@/components/categories/CategoryIcon';

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Akun[];
  categories: Kategori[];
  onSuccess: () => void;
  onAddAccountRequest?: () => void;
  initialData?: Transaksi | null;
}

export default function TransactionFormModal({
  isOpen,
  onClose,
  accounts,
  categories,
  onSuccess,
  onAddAccountRequest,
  initialData,
}: TransactionFormModalProps) {
  const [tipe, setTipe] = useState<JenisTransaksi>('pengeluaran');
  const [jumlah, setJumlah] = useState('');
  const [selectedAkunId, setSelectedAkunId] = useState('');
  const [targetAkunId, setTargetAkunId] = useState('');
  const [selectedKategoriId, setSelectedKategoriId] = useState('');
  const [tanggal, setTanggal] = useState(toInputDateFormat());
  const [keterangan, setKeterangan] = useState('');

  // Quick category creation state
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('shopping-bag');

  // Foto bukti
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const prevIsOpenRef = useRef(false);

  // Populate data if editing
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      if (initialData) {
        setTipe(initialData.tipe);
        setJumlah(initialData.jumlah.toString());
        setSelectedAkunId(initialData.akun_id);
        setTargetAkunId(initialData.target_akun_id || '');
        setSelectedKategoriId(initialData.kategori_id || '');
        setTanggal(initialData.tanggal);
        setKeterangan(initialData.keterangan || '');
        setPhotoPreview(initialData.foto_url || null);
      } else {
        setTipe('pengeluaran');
        setJumlah('');
        setSelectedAkunId(accounts[0]?.id?.toString() || '');
        setTargetAkunId('');
        setSelectedKategoriId('');
        setTanggal(toInputDateFormat());
        setKeterangan('');
        setPhotoPreview(null);
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [initialData, isOpen, accounts]);

  if (!isOpen) return null;

  const activeAkunId = selectedAkunId || accounts[0]?.id?.toString() || '';
  const filteredCategories = categories.filter((c) => c.tipe === tipe);

  const handleNominalShortcut = (addAmount: number) => {
    const current = parseFloat(jumlah.replace(/\D/g, '')) || 0;
    setJumlah((current + addAmount).toString());
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const compressed = await compressImageToBase64(file);
      setPhotoPreview(compressed);
    } catch {
      setErrorMsg('Gagal memproses foto lampiran.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuickCategory = async () => {
    if (!newCategoryName.trim()) return;
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const id = await db.kategori.add({
        nama: newCategoryName.trim(),
        tipe: tipe as 'pemasukan' | 'pengeluaran',
        icon: newCategoryIcon,
        warna_hex: '#10B981',
        is_default: false,
        created_at: now,
        updated_at: now,
      });

      setSelectedKategoriId(id.toString());
      setIsAddingCategory(false);
      setNewCategoryName('');
      onSuccess();
    } catch {
      setErrorMsg('Gagal menambahkan kategori baru.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nominal = parseFloat(jumlah.replace(/\D/g, '')) || 0;
    if (nominal <= 0) {
      setErrorMsg('Masukkan nominal transaksi.');
      return;
    }

    if (!activeAkunId) {
      setErrorMsg('Pilih akun / dompet sumber.');
      return;
    }

    if (tipe === 'transfer') {
      if (!targetAkunId) {
        setErrorMsg('Pilih akun dompet tujuan transfer.');
        return;
      }
      if (activeAkunId === targetAkunId) {
        setErrorMsg('Akun asal dan akun tujuan transfer tidak boleh sama.');
        return;
      }
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const now = new Date().toISOString();

      if (initialData?.id) {
        await db.transaksi.update(initialData.id, {
          akun_id: activeAkunId,
          target_akun_id: tipe === 'transfer' ? targetAkunId : undefined,
          kategori_id: tipe !== 'transfer' ? selectedKategoriId || undefined : undefined,
          tanggal,
          tipe,
          jumlah: nominal,
          keterangan: keterangan.trim() || undefined,
          foto_url: photoPreview || undefined,
          updated_at: now,
        });
      } else {
        await db.transaksi.add({
          akun_id: activeAkunId,
          target_akun_id: tipe === 'transfer' ? targetAkunId : undefined,
          kategori_id: tipe !== 'transfer' ? selectedKategoriId || undefined : undefined,
          tanggal,
          tipe,
          jumlah: nominal,
          keterangan: keterangan.trim() || undefined,
          foto_url: photoPreview || undefined,
          created_at: now,
          updated_at: now,
        });
      }

      await recalculateAllAccountBalances();

      onSuccess();
      onClose();
    } catch {
      setErrorMsg('Gagal menyimpan transaksi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full sm:max-w-md bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {initialData ? 'Edit Transaksi' : 'Catat Transaksi'}
            </h2>
            <p className="text-xs text-slate-500">Pencatatan keuangan personal otomatis</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            aria-label="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Jenis Transaksi */}
        <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-2xl mt-3">
          <button
            type="button"
            onClick={() => {
              setTipe('pengeluaran');
              setSelectedKategoriId('');
            }}
            className={`py-2 text-xs font-semibold rounded-xl transition-all ${
              tipe === 'pengeluaran'
                ? 'bg-white text-rose-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pengeluaran
          </button>
          <button
            type="button"
            onClick={() => {
              setTipe('pemasukan');
              setSelectedKategoriId('');
            }}
            className={`py-2 text-xs font-semibold rounded-xl transition-all ${
              tipe === 'pemasukan'
                ? 'bg-white text-emerald-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pemasukan
          </button>
          <button
            type="button"
            onClick={() => setTipe('transfer')}
            className={`py-2 text-xs font-semibold rounded-xl transition-all ${
              tipe === 'transfer'
                ? 'bg-white text-sky-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Transfer
          </button>
        </div>

        {errorMsg && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto space-y-4 py-3 flex-1 pr-1">
          {/* Input Nominal */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nominal (Rp)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={
                  jumlah ? Number(jumlah.replace(/\D/g, '')).toLocaleString('id-ID') : ''
                }
                onChange={(e) => setJumlah(e.target.value.replace(/\D/g, ''))}
                placeholder="0"
                required
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 tabular-nums"
              />
            </div>

            {/* Quick shortcuts */}
            <div className="flex gap-1.5 mt-2">
              {[10000, 20000, 50000, 100000].map((nominal) => (
                <button
                  key={nominal}
                  type="button"
                  onClick={() => handleNominalShortcut(nominal)}
                  className="flex-1 py-1.5 px-1 bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold text-slate-600 rounded-xl transition-colors"
                >
                  +{nominal >= 1000 ? `${nominal / 1000}rb` : nominal}
                </button>
              ))}
            </div>
          </div>

          {/* Akun Sumber */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                {tipe === 'transfer' ? 'Dari Akun (Asal)' : 'Akun / Dompet'}
              </label>
              {onAddAccountRequest && (
                <button
                  type="button"
                  onClick={onAddAccountRequest}
                  className="text-[11px] font-semibold text-emerald-600 hover:underline"
                >
                  + Tambah Akun
                </button>
              )}
            </div>
            {accounts.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                Kamu belum membuat akun dompet. Silakan buat akun terlebih dahulu melalui tab Dompet.
              </div>
            ) : (
              <select
                value={activeAkunId}
                onChange={(e) => setSelectedAkunId(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.nama} ({formatRupiah(acc.saldo_sekarang)})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Akun Tujuan Jika Tipe Transfer */}
          {tipe === 'transfer' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ke Akun (Tujuan)
              </label>
              <select
                value={targetAkunId}
                onChange={(e) => setTargetAkunId(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Pilih akun tujuan...</option>
                {accounts
                  .filter((acc) => acc.id?.toString() !== activeAkunId)
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.nama} ({formatRupiah(acc.saldo_sekarang)})
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Kategori Selector Grid dengan React Icon yang Rapih */}
          {tipe !== 'transfer' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">Kategori</label>
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(!isAddingCategory)}
                  className="text-[11px] font-semibold text-emerald-600 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Kategori Baru</span>
                </button>
              </div>

              {isAddingCategory && (
                <div className="mb-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Nama kategori baru..."
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={handleCreateQuickCategory}
                      className="py-1 px-3 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
                    >
                      Simpan
                    </button>
                  </div>
                  {/* Quick Icon Selector */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {CATEGORY_ICON_LIST.slice(0, 10).map((opt) => (
                      <button
                        key={opt.name}
                        type="button"
                        onClick={() => setNewCategoryIcon(opt.name)}
                        className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                          newCategoryIcon === opt.name
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white text-slate-600 hover:bg-slate-200'
                        }`}
                        title={opt.label}
                      >
                        <CategoryIcon name={opt.name} className="w-3.5 h-3.5" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Category Grid with Lucide React Icons */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto pr-1">
                {filteredCategories.map((cat) => {
                  const isSelected = selectedKategoriId === cat.id?.toString();
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedKategoriId(cat.id?.toString() || '')}
                      className={`p-2 rounded-xl text-xs font-medium text-left flex items-center gap-2 transition-all border ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm font-semibold'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-white/20 text-white' : ''
                        }`}
                        style={
                          !isSelected && cat.warna_hex
                            ? { backgroundColor: `${cat.warna_hex}1A`, color: cat.warna_hex }
                            : undefined
                        }
                      >
                        <CategoryIcon name={cat.icon} className="w-3.5 h-3.5" />
                      </span>
                      <span className="truncate">{cat.nama}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tanggal & Keterangan */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal</label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan</label>
              <input
                type="text"
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Catatan..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Lampirkan Foto Bukti */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Foto Bukti / Struk (Opsional)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoSelect}
              className="hidden"
            />
            {photoPreview ? (
              <div className="relative w-full h-24 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoPreview}
                  alt="Bukti Struk"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setPhotoPreview(null)}
                  className="absolute top-1.5 right-1.5 p-1 bg-black/60 rounded-full text-white hover:bg-black transition-colors"
                  aria-label="Hapus Foto"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-3 bg-slate-50 border border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl flex items-center justify-center gap-2 text-xs font-medium text-slate-600 hover:text-emerald-700 transition-colors"
              >
                <Camera className="w-4 h-4 text-emerald-600" />
                <ImageIcon className="w-4 h-4 text-sky-500" />
                <span>Ambil Foto atau Pilih dari Galeri</span>
              </button>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || accounts.length === 0}
              className="w-full min-h-11 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-[0.99] transition-all"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : initialData ? (
                'Simpan Perubahan'
              ) : (
                `Simpan ${tipe === 'pengeluaran' ? 'Pengeluaran' : tipe === 'pemasukan' ? 'Pemasukan' : 'Transfer'}`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
