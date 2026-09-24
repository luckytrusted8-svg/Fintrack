import React from 'react';
import {
  Wallet,
  Banknote,
  Building2,
  Landmark,
  Smartphone,
  CreditCard,
  TrendingUp,
  Coins,
  PiggyBank,
  QrCode,
  DollarSign,
  ShieldCheck,
  Briefcase,
  LucideIcon,
} from 'lucide-react';
import { JenisAkun } from '@/lib/db';

export interface AccountIconOption {
  name: string;
  label: string;
  icon: LucideIcon;
}

export const ACCOUNT_ICON_OPTIONS: AccountIconOption[] = [
  { name: 'wallet', label: 'Dompet Utama', icon: Wallet },
  { name: 'banknote', label: 'Uang Tunai', icon: Banknote },
  { name: 'building-2', label: 'Rekening Bank', icon: Building2 },
  { name: 'landmark', label: 'Bank Pusat', icon: Landmark },
  { name: 'smartphone', label: 'E-Wallet', icon: Smartphone },
  { name: 'credit-card', label: 'Kartu Debit/Kredit', icon: CreditCard },
  { name: 'trending-up', label: 'Investasi', icon: TrendingUp },
  { name: 'coins', label: 'Koin / Receh', icon: Coins },
  { name: 'piggy-bank', label: 'Celengan', icon: PiggyBank },
  { name: 'qr-code', label: 'QRIS / Digital', icon: QrCode },
  { name: 'dollar-sign', label: 'Valas / Dollar', icon: DollarSign },
  { name: 'shield-check', label: 'Dana Darurat', icon: ShieldCheck },
];

const ACCOUNT_ICON_MAP: Record<string, LucideIcon> = {
  wallet: Wallet,
  banknote: Banknote,
  'building-2': Building2,
  landmark: Landmark,
  smartphone: Smartphone,
  'credit-card': CreditCard,
  'trending-up': TrendingUp,
  coins: Coins,
  'piggy-bank': PiggyBank,
  'qr-code': QrCode,
  'dollar-sign': DollarSign,
  'shield-check': ShieldCheck,
  briefcase: Briefcase,
};

export const ACCOUNT_TYPE_ICONS: Record<JenisAkun, LucideIcon> = {
  cash: Banknote,
  bank: Building2,
  ewallet: Smartphone,
  investasi: TrendingUp,
  lainnya: Wallet,
};

interface AccountIconProps {
  name?: string;
  jenis?: JenisAkun;
  className?: string;
  size?: number;
}

export default function AccountIcon({
  name,
  jenis,
  className = 'w-4 h-4',
  size,
}: AccountIconProps) {
  if (name && ACCOUNT_ICON_MAP[name]) {
    const IconComponent = ACCOUNT_ICON_MAP[name];
    return <IconComponent className={className} size={size} />;
  }

  if (jenis && ACCOUNT_TYPE_ICONS[jenis]) {
    const IconComponent = ACCOUNT_TYPE_ICONS[jenis];
    return <IconComponent className={className} size={size} />;
  }

  return <Wallet className={className} size={size} />;
}
