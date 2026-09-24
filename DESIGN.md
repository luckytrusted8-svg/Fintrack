# DESIGN.md - Fintrack Visual & Product Design Direction

## Product Identity
- **Name**: Fintrack
- **Tagline**: Personal Finance Tracker (Single-User Mobile PWA)
- **Audience**: Pengguna pribadi yang ingin mencatat keuangan harian dengan cepat, akurat, dan privasi penuh.
- **Visual Personality**: Modern, tenang, presisi finansial, elegan, dan fokus pada kejelasan angka (clarity over clutter).

## Dial Settings (Antislop Part 3)
- **ENERGY**: 2 (Balanced - profesional, fokus, visual hierarki tegas)
- **RHYTHM**: 2 (Konsisten dengan variasi terukur antara kartu ringkasan, grafik, dan list transaksi)
- **MOTION**: 1 (Hanya feedback interaksi, transisi tab/modal cepat, tanpa animasi looping yang mendistraksi)

## Color Palette (Emerald & Dark Slate)
- **Core Neutral Base (Dark Mode default untuk OLED mobile)**:
  - Deep Base: `#0B0F17` (Obsidian Slate)
  - Surface Card: `#131B2E` / `#162036` (Solid Navy-Slate)
  - Elevated Surface: `#1E293B`
  - Border Subdued: `#2A374F` (Batas tegas minimal 3:1 contrast)
- **Primary Brand & Upward Metric (sesuai logo resmi)**:
  - Brand Emerald: `#10B981` (Warna panah & grafik bertumbuh)
  - Accent Mint: `#34D399` (Highlight & badge positif)
- **Financial Status Colors**:
  - Pemasukan (Income): `#10B981` (Emerald)
  - Pengeluaran (Expense): `#F43F5E` (Rose Coral)
  - Transfer/Netral: `#38BDF8` (Sky Blue)
  - Peringatan Anggaran: `#F59E0B` (Amber)
- **Typography Colors**:
  - Primary Text: `#F8FAFC` (Kontras 16.5:1 terhadap base)
  - Secondary Text: `#94A3B8` (Kontras 5.2:1 terhadap surface, lolos WCAG AA)
  - Muted Label: `#64748B` (Untuk helper text besar / non-kritis)

## Typography & Numbers
- Font Family: Inter / System Sans-serif modern
- Format Angka Finansial: `tabular-nums` untuk perataan nominal yang rapi
- Simbol Mata Uang: Rupiah (`Rp`) dengan pemisah ribuan titik (`Rp 1.500.000`)

## Mobile First & PWA Principles
- **Tap Targets**: Minimal 44px x 44px dengan spacing yang cukup
- **Bottom Navigation**: Navigasi jempol mudah dijangkau (Beranda, Transaksi, Anggaran, Tabungan, Akun/Laporan)
- **Quick-Add Floating Action**: 1 tap untuk modal catat transaksi cepat
- **States**: Selalu sediakan Empty State yang ramah & Loading State yang jelas
- **Strict Data Rule**: Nol data dummy, semua angka dikalkulasi dari tabel database Supabase secara real-time.
