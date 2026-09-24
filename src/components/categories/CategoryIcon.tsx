import React from 'react';
import {
  Utensils,
  Car,
  Home,
  Receipt,
  Gamepad2,
  HeartPulse,
  GraduationCap,
  ShoppingBag,
  ShoppingCart,
  Briefcase,
  Laptop,
  Gift,
  TrendingUp,
  PlusCircle,
  Coffee,
  Plane,
  Bus,
  Fuel,
  Bike,
  Film,
  Music,
  Dumbbell,
  Shirt,
  Baby,
  Stethoscope,
  Wallet,
  CreditCard,
  Coins,
  PiggyBank,
  BadgePercent,
  Tag,
  MoreHorizontal,
  LucideIcon,
} from 'lucide-react';

export interface CategoryIconOption {
  name: string;
  label: string;
  icon: LucideIcon;
}

export const CATEGORY_ICON_LIST: CategoryIconOption[] = [
  // Makanan & Minuman
  { name: 'utensils', label: 'Makanan', icon: Utensils },
  { name: 'coffee', label: 'Kopi / Minuman', icon: Coffee },
  // Transportasi
  { name: 'car', label: 'Mobil / Ojol', icon: Car },
  { name: 'fuel', label: 'Bensin', icon: Fuel },
  { name: 'bus', label: 'Transportasi Umum', icon: Bus },
  { name: 'bike', label: 'Motor / Sepeda', icon: Bike },
  { name: 'plane', label: 'Perjalanan', icon: Plane },
  // Kebutuhan & Belanja
  { name: 'shopping-bag', label: 'Belanja', icon: ShoppingBag },
  { name: 'shopping-cart', label: 'Supermarket', icon: ShoppingCart },
  { name: 'home', label: 'Rumah', icon: Home },
  { name: 'receipt', label: 'Tagihan / Listrik', icon: Receipt },
  // Hiburan & Hobi
  { name: 'gamepad-2', label: 'Game / Hiburan', icon: Gamepad2 },
  { name: 'film', label: 'Bioskop / Nonton', icon: Film },
  { name: 'music', label: 'Musik', icon: Music },
  { name: 'dumbbell', label: 'Olahraga / Gym', icon: Dumbbell },
  { name: 'shirt', label: 'Pakaian', icon: Shirt },
  { name: 'gift', label: 'Hadiah / Donasi', icon: Gift },
  // Kesehatan & Keluarga
  { name: 'heart-pulse', label: 'Kesehatan', icon: HeartPulse },
  { name: 'stethoscope', label: 'Dokter / Obat', icon: Stethoscope },
  { name: 'graduation-cap', label: 'Pendidikan', icon: GraduationCap },
  { name: 'baby', label: 'Anak / Bayi', icon: Baby },
  // Pemasukan & Keuangan
  { name: 'briefcase', label: 'Gaji / Kantor', icon: Briefcase },
  { name: 'laptop', label: 'Freelance / Bisnis', icon: Laptop },
  { name: 'trending-up', label: 'Investasi', icon: TrendingUp },
  { name: 'wallet', label: 'Dompet', icon: Wallet },
  { name: 'credit-card', label: 'Kartu', icon: CreditCard },
  { name: 'coins', label: 'Koin / Uang', icon: Coins },
  { name: 'piggy-bank', label: 'Tabungan', icon: PiggyBank },
  { name: 'badge-percent', label: 'Diskon / Cashback', icon: BadgePercent },
  { name: 'plus-circle', label: 'Pemasukan Lain', icon: PlusCircle },
  { name: 'more-horizontal', label: 'Lain-lain', icon: MoreHorizontal },
  { name: 'tag', label: 'Label Lain', icon: Tag },
];

const ICON_MAP: Record<string, LucideIcon> = {
  utensils: Utensils,
  coffee: Coffee,
  car: Car,
  fuel: Fuel,
  bus: Bus,
  bike: Bike,
  plane: Plane,
  'shopping-bag': ShoppingBag,
  'shopping-cart': ShoppingCart,
  home: Home,
  receipt: Receipt,
  'gamepad-2': Gamepad2,
  film: Film,
  music: Music,
  dumbbell: Dumbbell,
  shirt: Shirt,
  gift: Gift,
  'heart-pulse': HeartPulse,
  stethoscope: Stethoscope,
  'graduation-cap': GraduationCap,
  baby: Baby,
  briefcase: Briefcase,
  laptop: Laptop,
  'trending-up': TrendingUp,
  wallet: Wallet,
  'credit-card': CreditCard,
  coins: Coins,
  'piggy-bank': PiggyBank,
  'badge-percent': BadgePercent,
  'plus-circle': PlusCircle,
  'more-horizontal': MoreHorizontal,
  tag: Tag,
};

interface CategoryIconProps {
  name?: string;
  className?: string;
  size?: number;
}

export default function CategoryIcon({
  name = 'tag',
  className = 'w-4 h-4',
  size,
}: CategoryIconProps) {
  const IconComponent = ICON_MAP[name] || Tag;
  return <IconComponent className={className} size={size} />;
}
