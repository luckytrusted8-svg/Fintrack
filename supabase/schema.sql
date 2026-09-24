-- ==============================================================================
-- FINTRACK - PERSONAL FINANCE TRACKER DATABASE SCHEMA (SUPABASE POSTGRESQL)
-- Aturan: Nol data dummy/transaksi. Semua tabel mulai kosong.
-- Hanya default kategori yang dibuatkan secara otomatis ketika user baru mendaftar.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUM TYPES
DO $$ BEGIN
  CREATE TYPE jenis_akun_enum AS ENUM ('bank', 'cash', 'ewallet', 'investasi', 'lainnya');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE jenis_transaksi_enum AS ENUM ('pemasukan', 'pengeluaran', 'transfer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE tipe_kategori_enum AS ENUM ('pemasukan', 'pengeluaran');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. PROFILES TABLE (Menyimpan profil pengguna yang terhubung dengan Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nama_lengkap TEXT,
  mata_uang TEXT DEFAULT 'IDR',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. AKUN (DOMPET / REKENING)
CREATE TABLE IF NOT EXISTS public.akun (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nama TEXT NOT NULL,
  jenis jenis_akun_enum NOT NULL DEFAULT 'cash',
  nomor_rekening TEXT,
  saldo_awal NUMERIC(15, 2) NOT NULL DEFAULT 0,
  saldo_sekarang NUMERIC(15, 2) NOT NULL DEFAULT 0,
  warna_hex TEXT DEFAULT '#10B981',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. KATEGORI (Pemasukan & Pengeluaran)
CREATE TABLE IF NOT EXISTS public.kategori (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nama TEXT NOT NULL,
  tipe tipe_kategori_enum NOT NULL,
  icon TEXT DEFAULT 'tag',
  warna_hex TEXT DEFAULT '#10B981',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TRANSAKSI
CREATE TABLE IF NOT EXISTS public.transaksi (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  akun_id UUID NOT NULL REFERENCES public.akun(id) ON DELETE CASCADE,
  target_akun_id UUID REFERENCES public.akun(id) ON DELETE SET NULL, -- Diisi jika tipe = 'transfer'
  kategori_id UUID REFERENCES public.kategori(id) ON DELETE SET NULL,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  tipe jenis_transaksi_enum NOT NULL,
  jumlah NUMERIC(15, 2) NOT NULL CHECK (jumlah > 0),
  keterangan TEXT,
  foto_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TRANSAKSI RUTIN (Recurring)
CREATE TABLE IF NOT EXISTS public.transaksi_rutin (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  akun_id UUID NOT NULL REFERENCES public.akun(id) ON DELETE CASCADE,
  kategori_id UUID REFERENCES public.kategori(id) ON DELETE SET NULL,
  tipe jenis_transaksi_enum NOT NULL,
  jumlah NUMERIC(15, 2) NOT NULL CHECK (jumlah > 0),
  keterangan TEXT NOT NULL,
  tanggal_setiap_bulan INT NOT NULL CHECK (tanggal_setiap_bulan >= 1 AND tanggal_setiap_bulan <= 31),
  is_active BOOLEAN NOT NULL DEFAULT true,
  auto_generate BOOLEAN NOT NULL DEFAULT false,
  terakhir_dijalankan DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. ANGGARAN (Budget Bulanan per Kategori)
CREATE TABLE IF NOT EXISTS public.anggaran (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kategori_id UUID NOT NULL REFERENCES public.kategori(id) ON DELETE CASCADE,
  bulan INT NOT NULL CHECK (bulan >= 1 AND bulan <= 12),
  tahun INT NOT NULL CHECK (tahun >= 2020 AND tahun <= 2100),
  nominal_limit NUMERIC(15, 2) NOT NULL CHECK (nominal_limit > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_anggaran_user_kategori_bulan_tahun UNIQUE (user_id, kategori_id, bulan, tahun)
);

-- 9. TABUNGAN DENGAN TARGET
CREATE TABLE IF NOT EXISTS public.tabungan (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nama_target TEXT NOT NULL,
  target_nominal NUMERIC(15, 2) NOT NULL CHECK (target_nominal > 0),
  terkumpul NUMERIC(15, 2) NOT NULL DEFAULT 0,
  target_tanggal DATE,
  foto_url TEXT,
  keterangan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.akun ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kategori ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaksi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaksi_rutin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anggaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tabungan ENABLE ROW LEVEL SECURITY;

-- Policies: Hanya user pemilik data yang bisa SELECT, INSERT, UPDATE, DELETE
CREATE POLICY "Users can manage own profile" ON public.profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can manage own accounts" ON public.akun
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own categories" ON public.kategori
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own transactions" ON public.transaksi
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own recurring transactions" ON public.transaksi_rutin
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own budgets" ON public.anggaran
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own savings goals" ON public.tabungan
  FOR ALL USING (auth.uid() = user_id);

-- 11. RECALCULATE BALANCE FUNCTION & TRIGGERS
-- Menghitung ulang saldo_sekarang akun secara akurat berdasarkan saldo_awal + seluruh mutasi transaksi
CREATE OR REPLACE FUNCTION public.recalculate_account_balance(target_account_id UUID)
RETURNS VOID AS $$
DECLARE
  v_saldo_awal NUMERIC(15, 2) := 0;
  v_pemasukan NUMERIC(15, 2) := 0;
  v_pengeluaran NUMERIC(15, 2) := 0;
  v_transfer_masuk NUMERIC(15, 2) := 0;
  v_transfer_keluar NUMERIC(15, 2) := 0;
BEGIN
  SELECT saldo_awal INTO v_saldo_awal FROM public.akun WHERE id = target_account_id;
  
  -- Hitung pemasukan langsung
  SELECT COALESCE(SUM(jumlah), 0) INTO v_pemasukan
  FROM public.transaksi
  WHERE akun_id = target_account_id AND tipe = 'pemasukan';

  -- Hitung pengeluaran langsung
  SELECT COALESCE(SUM(jumlah), 0) INTO v_pengeluaran
  FROM public.transaksi
  WHERE akun_id = target_account_id AND tipe = 'pengeluaran';

  -- Hitung transfer masuk (sebagai target)
  SELECT COALESCE(SUM(jumlah), 0) INTO v_transfer_masuk
  FROM public.transaksi
  WHERE target_akun_id = target_account_id AND tipe = 'transfer';

  -- Hitung transfer keluar (sebagai asal)
  SELECT COALESCE(SUM(jumlah), 0) INTO v_transfer_keluar
  FROM public.transaksi
  WHERE akun_id = target_account_id AND tipe = 'transfer';

  -- Update saldo terkini akun
  UPDATE public.akun
  SET saldo_sekarang = v_saldo_awal + v_pemasukan - v_pengeluaran + v_transfer_masuk - v_transfer_keluar,
      updated_at = NOW()
  WHERE id = target_account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger setelah Transaksi di-insert, update, atau delete
CREATE OR REPLACE FUNCTION public.trigger_sync_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.recalculate_account_balance(NEW.akun_id);
    IF NEW.tipe = 'transfer' AND NEW.target_akun_id IS NOT NULL THEN
      PERFORM public.recalculate_account_balance(NEW.target_akun_id);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.recalculate_account_balance(NEW.akun_id);
    IF OLD.akun_id <> NEW.akun_id THEN
      PERFORM public.recalculate_account_balance(OLD.akun_id);
    END IF;
    IF NEW.tipe = 'transfer' AND NEW.target_akun_id IS NOT NULL THEN
      PERFORM public.recalculate_account_balance(NEW.target_akun_id);
    END IF;
    IF OLD.tipe = 'transfer' AND OLD.target_akun_id IS NOT NULL AND OLD.target_akun_id <> NEW.target_akun_id THEN
      PERFORM public.recalculate_account_balance(OLD.target_akun_id);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_account_balance(OLD.akun_id);
    IF OLD.tipe = 'transfer' AND OLD.target_akun_id IS NOT NULL THEN
      PERFORM public.recalculate_account_balance(OLD.target_akun_id);
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_transaksi_sync_balance ON public.transaksi;
CREATE TRIGGER trg_transaksi_sync_balance
AFTER INSERT OR UPDATE OR DELETE ON public.transaksi
FOR EACH ROW EXECUTE FUNCTION public.trigger_sync_account_balance();

-- Trigger saat saldo_awal akun diubah
CREATE OR REPLACE FUNCTION public.trigger_sync_on_saldo_awal_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.saldo_awal <> NEW.saldo_awal THEN
    PERFORM public.recalculate_account_balance(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_akun_saldo_awal_sync ON public.akun;
CREATE TRIGGER trg_akun_saldo_awal_sync
AFTER UPDATE OF saldo_awal ON public.akun
FOR EACH ROW EXECUTE FUNCTION public.trigger_sync_on_saldo_awal_change();

-- 12. TRIGGER INITIAL USER REGISTRATION: BUAT PROFIL & KATEGORI DEFAULT
-- Sesuai aturan: NOL transaksi/saldo dummy. Hanya kategori default umum bertanda is_default = true.
CREATE OR REPLACE FUNCTION public.handle_new_user_setup()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert ke profiles
  INSERT INTO public.profiles (id, email, nama_lengkap)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );

  -- Kategori Pengeluaran Default (Tandai is_default = true, dapat diedit/dihapus oleh user)
  INSERT INTO public.kategori (user_id, nama, tipe, icon, warna_hex, is_default) VALUES
    (NEW.id, 'Makanan & Minuman', 'pengeluaran', 'utensils', '#F43F5E', true),
    (NEW.id, 'Transportasi', 'pengeluaran', 'car', '#FB923C', true),
    (NEW.id, 'Kebutuhan Rumah', 'pengeluaran', 'home', '#FBBF24', true),
    (NEW.id, 'Tagihan & Langganan', 'pengeluaran', 'receipt', '#A855F7', true),
    (NEW.id, 'Hiburan & Hobi', 'pengeluaran', 'gamepad-2', '#EC4899', true),
    (NEW.id, 'Kesehatan', 'pengeluaran', 'heart-pulse', '#06B6D4', true),
    (NEW.id, 'Pendidikan', 'pengeluaran', 'graduation-cap', '#3B82F6', true),
    (NEW.id, 'Belanja Pribadi', 'pengeluaran', 'shopping-bag', '#10B981', true),
    (NEW.id, 'Lain-lain', 'pengeluaran', 'more-horizontal', '#6B7280', true);

  -- Kategori Pemasukan Default
  INSERT INTO public.kategori (user_id, nama, tipe, icon, warna_hex, is_default) VALUES
    (NEW.id, 'Gaji Utama', 'pemasukan', 'briefcase', '#10B981', true),
    (NEW.id, 'Pekerjaan Sampingan', 'pemasukan', 'laptop', '#34D399', true),
    (NEW.id, 'Bonus & THR', 'pemasukan', 'gift', '#F59E0B', true),
    (NEW.id, 'Investasi & Bunga', 'pemasukan', 'trending-up', '#06B6D4', true),
    (NEW.id, 'Pemasukan Lainnya', 'pemasukan', 'plus-circle', '#6B7280', true);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_setup();

-- 13. REALTIME PUBLICATION ENABLEMENT
-- Mengaktifkan Supabase Realtime untuk tabel utama agar UI langsung sync tanpa refresh
ALTER PUBLICATION supabase_realtime ADD TABLE public.akun;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transaksi;
ALTER PUBLICATION supabase_realtime ADD TABLE public.kategori;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tabungan;
ALTER PUBLICATION supabase_realtime ADD TABLE public.anggaran;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transaksi_rutin;

-- 14. SUPABASE STORAGE BUCKETS SETUP SCRIPT
-- Buat bucket untuk foto bukti struk transaksi ('receipts') dan foto target tabungan ('goals')
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true),
       ('goals', 'goals', true)
ON CONFLICT (id) DO NOTHING;

-- Policy Storage: Hanya user yang memiliki folder auth.uid() yang bisa upload/delete
CREATE POLICY "Public Read Receipts" ON storage.objects
  FOR SELECT USING (bucket_id = 'receipts');

CREATE POLICY "Users can upload receipt photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'receipts' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own receipts" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'receipts' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Public Read Goals" ON storage.objects
  FOR SELECT USING (bucket_id = 'goals');

CREATE POLICY "Users can upload goal photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'goals' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own goals" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'goals' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
