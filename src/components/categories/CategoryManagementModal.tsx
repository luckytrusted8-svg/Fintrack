'use client';

import React, { useState } from 'react';
import { Kategori, TipeKategori, db } from '@/lib/db';
import { X, Plus, Edit2, Trash2, Check, AlertCircle, Loader2 } from 'lucide-react';
import CategoryIcon, { CATEGORY_ICON_LIST } from './CategoryIcon';

interface CategoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Kategori[];
  onRefresh: () => void;
}

const COLOR_OPTIONS = [
  '#F43F5E', '#FB923C', '#FBBF24', '#10B981', '#06B6D4',
  '#3B82F6', '#8B5CF6', '#EC4899', '#64748B', '#0F172A',
];

export default function CategoryManagementModal({
  isOpen,
  onClose,
  categories,
  onRefresh,
}: CategoryManagementModalProps) {
  const [activeTab, setActiveTab] = useState<TipeKategori>('pengeluaran');
  const [editingCategory, setEditingCategory] = useState<Kategori | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Form states
  const [nama, setNama] = useState('');
  const [iconName, setIconName] = useState('tag');
  const [warnaHex, setWarnaHex] = useState(COLOR_OPTIONS[0]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const filtered = categories.filter((c) => c.tipe === activeTab);

  const startEdit = (cat: Kategori) => {
    setEditingCategory(cat);
    setNama(cat.nama);
    setIconName(cat.icon || 'tag');
    setWarnaHex(cat.warna_hex || COLOR_OPTIONS[0]);
    setIsAdding(false);
    setErrorMsg(null);
  };

  const startAdd = () => {
    setEditingCategory(null);
    setNama('');
    setIconName(activeTab === 'pemasukan' ? 'briefcase' : 'shopping-bag');
    setWarnaHex(COLOR_OPTIONS[0]);
    setIsAdding(true);
    setErrorMsg(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) {
      setErrorMsg('Nama kategori tidak boleh kosong.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const now = new Date().toISOString();
      if (editingCategory?.id) {
        await db.kategori.update(editingCategory.id, {
          nama: nama.trim(),
          icon: iconName,
          warna_hex: warnaHex,
          updated_at: now,
        });
      } else {
        await db.kategori.add({
          nama: nama.trim(),
          tipe: activeTab,
          icon: iconName,
          warna_hex: warnaHex,
          is_default: false,
          created_at: now,
          updated_at: now,
        });
      }

      setEditingCategory(null);
      setIsAdding(false);
      setNama('');
      onRefresh();
    } catch {
      setErrorMsg('Gagal menyimpan kategori.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!confirm('Hapus kategori ini? Transaksi terkait akan tetap tersimpan di riwayat.')) {
      return;
    }

    try {
      await db.kategori.delete(id);
      onRefresh();
    } catch {
      setErrorMsg('Gagal menghapus kategori.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-5 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Kelola Kategori</h3>
            <p className="text-xs text-slate-500">Sesuaikan nama, ikon, dan warna kategori</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Pemasukan / Pengeluaran */}
        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl mt-3">
          <button
            type="button"
            onClick={() => {
              setActiveTab('pengeluaran');
              setIsAdding(false);
              setEditingCategory(null);
            }}
            className={`py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'pengeluaran'
                ? 'bg-white text-rose-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pengeluaran
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('pemasukan');
              setIsAdding(false);
              setEditingCategory(null);
            }}
            className={`py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'pemasukan'
                ? 'bg-white text-emerald-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pemasukan
          </button>
        </div>

        {errorMsg && (
          <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 text-xs text-rose-700 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Content list or form */}
        <div className="overflow-y-auto py-3 space-y-2 flex-1 pr-1">
          {isAdding || editingCategory ? (
            <form onSubmit={handleSave} className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900">
                  {editingCategory ? 'Edit Kategori' : 'Tambah Kategori Baru'}
                </h4>
                {/* Live Preview Badge */}
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shadow-xs"
                  style={{ backgroundColor: `${warnaHex}20`, color: warnaHex }}
                >
                  <CategoryIcon name={iconName} className="w-4 h-4" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Kategori</label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Belanja Bulanan"
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Icon Selector Grid */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Pilih Ikon
                </label>
                <div className="grid grid-cols-6 gap-1.5 p-2 bg-white rounded-xl border border-slate-200 max-h-36 overflow-y-auto">
                  {CATEGORY_ICON_LIST.map((item) => {
                    const isSelected = iconName === item.name;
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => setIconName(item.name)}
                        title={item.label}
                        className={`p-2 rounded-lg flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <CategoryIcon name={item.name} className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Options */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Warna Label</label>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setWarnaHex(c)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform hover:scale-105 shadow-xs"
                      style={{ backgroundColor: c }}
                      aria-label={`Warna ${c}`}
                    >
                      {warnaHex === c && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingCategory(null);
                  }}
                  className="flex-1 py-2 text-xs font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center transition-colors shadow-xs"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Simpan'}
                </button>
              </div>
            </form>
          ) : (
            <>
              <button
                type="button"
                onClick={startAdd}
                className="w-full py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold text-emerald-700 rounded-2xl flex items-center justify-center gap-1.5 transition-colors mb-2.5"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Kategori {activeTab === 'pengeluaran' ? 'Pengeluaran' : 'Pemasukan'}</span>
              </button>

              <div className="space-y-2">
                {filtered.map((cat) => (
                  <div
                    key={cat.id}
                    className="p-3 bg-white border border-slate-200 hover:border-slate-300 rounded-2xl flex items-center justify-between transition-colors shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: `${cat.warna_hex || '#10B981'}1A`,
                          color: cat.warna_hex || '#10B981',
                        }}
                      >
                        <CategoryIcon name={cat.icon} className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-900 block">{cat.nama}</span>
                        {cat.is_default && (
                          <span className="text-[10px] text-slate-400 font-medium">Bawaan Sistem</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(cat)}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                        title="Edit kategori"
                        aria-label={`Edit ${cat.nama}`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(cat.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                        title="Hapus kategori"
                        aria-label={`Hapus ${cat.nama}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
