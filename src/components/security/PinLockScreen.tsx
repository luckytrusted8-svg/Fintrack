'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Delete, Lock } from 'lucide-react';

interface PinLockScreenProps {
  correctPin: string;
  onUnlocked: () => void;
  onResetPin?: () => void;
}

export default function PinLockScreen({
  correctPin,
  onUnlocked,
  onResetPin,
}: PinLockScreenProps) {
  const [enteredPin, setEnteredPin] = useState('');
  const [errorMsg, setErrorMsg] = useState(false);

  const handleKeyPress = (num: string) => {
    if (enteredPin.length < 4) {
      const nextPin = enteredPin + num;
      setEnteredPin(nextPin);
      setErrorMsg(false);

      if (nextPin.length === 4) {
        if (nextPin === correctPin) {
          onUnlocked();
        } else {
          setErrorMsg(true);
          setTimeout(() => {
            setEnteredPin('');
            setErrorMsg(false);
          }, 800);
        }
      }
    }
  };

  const handleDelete = () => {
    setEnteredPin((prev) => prev.slice(0, -1));
    setErrorMsg(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#F8FAFC] flex flex-col items-center justify-between p-6 select-none safe-bottom safe-top">
      {/* Top Header */}
      <div className="pt-8 flex flex-col items-center text-center">
        <div className="w-16 h-16 relative mb-4">
          <Image
            src="/logo.png"
            alt="Fintrack Logo"
            width={64}
            height={64}
            priority
            className="rounded-2xl shadow-md"
          />
        </div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Fintrack</h1>
        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
          <Lock className="w-3.5 h-3.5 text-emerald-600" />
          Masukkan 4 digit PIN keamanan
        </p>

        {/* PIN Indicators Dots */}
        <div className="flex gap-4 mt-8">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = enteredPin.length > idx;
            return (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                  errorMsg
                    ? 'bg-rose-500 scale-110'
                    : isFilled
                    ? 'bg-emerald-600 scale-110 shadow-sm shadow-emerald-600/30'
                    : 'bg-slate-200'
                }`}
              />
            );
          })}
        </div>

        {errorMsg && (
          <p className="text-xs font-semibold text-rose-600 mt-3 animate-pulse">
            PIN tidak sesuai. Silakan coba lagi.
          </p>
        )}
      </div>

      {/* Number Pad Grid */}
      <div className="w-full max-w-xs grid grid-cols-3 gap-3 pb-8">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => handleKeyPress(digit)}
            className="h-16 rounded-2xl bg-white active:bg-slate-100 border border-slate-200 text-xl font-bold text-slate-900 flex items-center justify-center transition-colors shadow-xs active:scale-95"
          >
            {digit}
          </button>
        ))}

        <div className="flex items-center justify-center">
          {onResetPin && (
            <button
              type="button"
              onClick={onResetPin}
              className="text-[11px] text-slate-400 hover:text-slate-600 px-2 py-1 font-medium"
            >
              Lupa PIN?
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => handleKeyPress('0')}
          className="h-16 rounded-2xl bg-white active:bg-slate-100 border border-slate-200 text-xl font-bold text-slate-900 flex items-center justify-center transition-colors shadow-xs active:scale-95"
        >
          0
        </button>

        <button
          type="button"
          onClick={handleDelete}
          disabled={enteredPin.length === 0}
          className="h-16 rounded-2xl bg-white active:bg-slate-100 border border-slate-200 text-slate-600 disabled:opacity-30 flex items-center justify-center transition-colors shadow-xs active:scale-95"
          aria-label="Hapus digit terakhir"
        >
          <Delete className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
