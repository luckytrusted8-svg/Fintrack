'use client';

import React, { useState, useRef, useEffect } from 'react';
import { db, exportDatabaseBackup, importDatabaseBackup, UserProfile } from '@/lib/db';
import {
  X,
  Download,
  Upload,
  User,
  Check,
  AlertCircle,
  Lock,
  Tag,
  Smartphone,
  Shield,
} from 'lucide-react';
import { saveAs } from 'file-saver';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  onRefresh: () => void;
  onOpenCategories: () => void;
}

export default function ProfileModal({
  isOpen,
  onClose,
  profile,
  onRefresh,
  onOpenCategories,
}: ProfileModalProps) {
  const [nama, setNama] = useState(profile?.nama_lengkap || 'Pengguna Fintrack');
  const [msg, setMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  // PIN settings state
  const [isPinEnabled, setIsPinEnabled] = useState(Boolean(profile?.pin_code));
  const [newPin, setNewPin] = useState('');
  const [showPinInput, setShowPinInput] = useState(false);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setNama(profile.nama_lengkap || 'Pengguna Fintrack');
      setIsPinEnabled(Boolean(profile.pin_code));
    }
  }, [profile]);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!isOpen) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) return;

    if (profile?.id) {
      await db.user_profile.update(profile.id, { nama_lengkap: nama.trim() });
    } else {
      await db.user_profile.add({
        nama_lengkap: nama.trim(),
        mata_uang: 'IDR',
        created_at: new Date().toISOString(),
      });
    }

    setMsg({ text: 'Nama profil berhasil diperbarui.' });
    onRefresh();
  };

  const handleTogglePin = async () => {
    if (isPinEnabled) {
      if (profile?.id) {
        await db.user_profile.update(profile.id, { pin_code: undefined });
      }
      setIsPinEnabled(false);
      setShowPinInput(false);
      setNewPin('');
      setMsg({ text: 'Kunci PIN dinonaktifkan.' });
      onRefresh();
    } else {
      setShowPinInput(true);
    }
  };

  const handleSaveNewPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 4) {
      setMsg({ text: 'PIN harus terdiri dari 4 digit angka.', isError: true });
      return;
    }

    if (profile?.id) {
      await db.user_profile.update(profile.id, { pin_code: newPin });
    } else {
      await db.user_profile.add({
        nama_lengkap: nama,
        pin_code: newPin,
        mata_uang: 'IDR',
        created_at: new Date().toISOString(),
      });
    }

    setIsPinEnabled(true);
    setShowPinInput(false);
    setNewPin('');
    setMsg({ text: 'PIN keamanan berhasil diaktifkan!' });
    onRefresh();
  };

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert(
        'Untuk memasang di HP: Buka menu browser (titik tiga di Chrome atau tombol Share di Safari), lalu pilih "Tambahkan ke Layar Utama" (Add to Home screen).'
      );
    }
  };

  const handleExportBackup = async () => {
    try {
      const backupJson = await exportDatabaseBackup();
      const blob = new Blob([backupJson], { type: 'application/json;charset=utf-8' });
      const filename = `fintrack_backup_${new Date().toISOString().slice(0, 10)}.json`;
      saveAs(blob, filename);
      setMsg({ text: 'Cadangan data berhasil diunduh!' });
    } catch {
      setMsg({ text: 'Gagal membuat file backup.', isError: true });
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          const success = await importDatabaseBackup(content);
          if (success) {
            setMsg({ text: 'Data berhasil dipulihkan dari cadangan!' });
            onRefresh();
          } else {
            setMsg({ text: 'Format file cadangan tidak sesuai.', isError: true });
          }
        } catch {
          setMsg({ text: 'File backup tidak valid.', isError: true });
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Pengaturan Fintrack</h3>
            <p className="text-xs text-slate-500">Profil, keamanan PIN, dan backup data</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {msg && (
          <div
            className={`p-2.5 rounded-2xl text-xs flex items-center gap-2 ${
              msg.isError
                ? 'bg-rose-50 border border-rose-200 text-rose-700'
                : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
            }`}
          >
            {msg.isError ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            ) : (
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
            )}
            <span>{msg.text}</span>
          </div>
        )}

        {/* Profil Nama */}
        <form onSubmit={handleSaveProfile} className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">Nama Pengguna</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-2xl transition-colors shadow-xs"
            >
              Simpan
            </button>
          </div>
        </form>

        {/* Keamanan Kunci PIN */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Kunci Keamanan PIN</h4>
                <p className="text-[10px] text-slate-500">Minta 4 digit PIN saat aplikasi dibuka</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleTogglePin}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors ${
                isPinEnabled
                  ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              {isPinEnabled ? 'Matikan' : 'Aktifkan'}
            </button>
          </div>

          {showPinInput && (
            <form onSubmit={handleSaveNewPin} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <label className="block text-[11px] font-semibold text-slate-700">Buat 4 Digit PIN Baru:</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="0000"
                  className="w-24 px-3 py-2 text-center bg-white border border-slate-200 rounded-xl text-sm text-slate-900 tracking-widest font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 transition-colors shadow-xs"
                >
                  Setel PIN
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Manajemen Kategori */}
        <div className="pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenCategories();
            }}
            className="w-full py-2.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 rounded-2xl flex items-center justify-between transition-colors shadow-xs"
          >
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-600" />
              <span>Kelola Kategori Pemasukan & Pengeluaran</span>
            </div>
            <span className="text-slate-400">→</span>
          </button>
        </div>

        {/* Pasang di HP (PWA) */}
        <div className="pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={handleInstallPwa}
            className="w-full py-2.5 px-3 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-xs font-semibold text-emerald-800 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xs"
          >
            <Smartphone className="w-4 h-4 text-emerald-600" />
            <span>Pasang Aplikasi di HP (PWA)</span>
          </button>
        </div>

        {/* Backup & Restore Data */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <div>
            <h4 className="text-xs font-bold text-slate-900">Cadangan Data (Backup & Restore)</h4>
            <p className="text-[10px] text-slate-500">
              Data tersimpan di HP Anda. Unduh salinan cadangan kapan pun agar data aman saat ganti HP.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleExportBackup}
              className="flex-1 py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-emerald-700 rounded-2xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Backup</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-sky-700 rounded-2xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Pulihkan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
