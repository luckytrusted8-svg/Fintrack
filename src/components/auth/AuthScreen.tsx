'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { LogIn, UserPlus, AlertCircle, Loader2 } from 'lucide-react';

export default function AuthScreen() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [namaLengkap, setNamaLengkap] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      if (isRegister) {
        if (!email || !password || !namaLengkap) {
          setErrorMessage('Mohon lengkapi nama, email, dan kata sandi.');
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: namaLengkap,
            },
          },
        });

        if (error) {
          setErrorMessage(error.message);
        } else {
          setInfoMessage('Pendaftaran berhasil. Silakan cek email Anda jika verifikasi diaktifkan, atau langsung masuk.');
          setIsRegister(false);
        }
      } else {
        if (!email || !password) {
          setErrorMessage('Masukkan email dan kata sandi Anda.');
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setErrorMessage('Email atau kata sandi tidak sesuai.');
          } else {
            setErrorMessage(error.message);
          }
        }
      }
    } catch {
      setErrorMessage('Terjadi kendala koneksi ke server. Pastikan konfigurasi Supabase sudah terpasang.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0B0F17]">
      <div className="w-full max-w-sm bg-[#131B2E] border border-[#1F2937] rounded-2xl p-6 sm:p-8 shadow-2xl">
        {/* App Logo & Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-20 h-20 relative mb-3">
            <Image
              src="/logo.png"
              alt="Logo Fintrack"
              width={80}
              height={80}
              priority
              className="rounded-2xl shadow-md"
            />
          </div>
          <h1 className="text-2xl font-bold text-[#F8FAFC]">Fintrack</h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Personal Finance Tracker mandiri & privat
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-[#0B0F17] p-1 rounded-xl mb-6 border border-[#1F2937]">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setErrorMessage(null);
              setInfoMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
              !isRegister
                ? 'bg-[#10B981] text-white'
                : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setErrorMessage(null);
              setInfoMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
              isRegister
                ? 'bg-[#10B981] text-white'
                : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            Daftar Akun
          </button>
        </div>

        {/* Alert Error / Success */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {infoMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
            {infoMessage}
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5" htmlFor="input-name">
                Nama Lengkap
              </label>
              <input
                id="input-name"
                type="text"
                value={namaLengkap}
                onChange={(e) => setNamaLengkap(e.target.value)}
                placeholder="Nama Anda"
                required={isRegister}
                className="w-full px-3.5 py-2.5 bg-[#0B0F17] border border-[#2A374F] rounded-xl text-sm text-[#F8FAFC] placeholder-[#64748B] focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] transition-all"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1.5" htmlFor="input-email">
              Alamat Email
            </label>
            <input
              id="input-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              required
              className="w-full px-3.5 py-2.5 bg-[#0B0F17] border border-[#2A374F] rounded-xl text-sm text-[#F8FAFC] placeholder-[#64748B] focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1.5" htmlFor="input-password">
              Kata Sandi
            </label>
            <input
              id="input-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              required
              minLength={6}
              className="w-full px-3.5 py-2.5 bg-[#0B0F17] border border-[#2A374F] rounded-xl text-sm text-[#F8FAFC] placeholder-[#64748B] focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[44px] py-2.5 px-4 bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 text-white font-medium text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#10B981]/20 active:scale-[0.99] transition-all"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : isRegister ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Buat Akun Fintrack</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Masuk Sekarang</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#1F2937] text-center">
          <p className="text-[11px] text-[#64748B]">
            Data keuangan tersimpan aman di database pribadi Supabase Anda.
          </p>
        </div>
      </div>
    </div>
  );
}
