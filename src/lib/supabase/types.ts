export type JenisAkun = 'bank' | 'cash' | 'ewallet' | 'investasi' | 'lainnya';
export type JenisTransaksi = 'pemasukan' | 'pengeluaran' | 'transfer';
export type TipeKategori = 'pemasukan' | 'pengeluaran';

export interface Profile {
  id: string;
  email: string;
  nama_lengkap: string | null;
  mata_uang: string;
  created_at: string;
  updated_at: string;
}

export interface Akun {
  id: string;
  user_id: string;
  nama: string;
  jenis: JenisAkun;
  nomor_rekening?: string | null;
  saldo_awal: number;
  saldo_sekarang: number;
  warna_hex: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Kategori {
  id: string;
  user_id: string;
  nama: string;
  tipe: TipeKategori;
  icon?: string | null;
  warna_hex: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaksi {
  id: string;
  user_id: string;
  akun_id: string;
  target_akun_id?: string | null;
  kategori_id?: string | null;
  tanggal: string; // YYYY-MM-DD
  tipe: JenisTransaksi;
  jumlah: number;
  keterangan?: string | null;
  foto_url?: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined fields for display
  akun?: Akun;
  target_akun?: Akun;
  kategori?: Kategori;
}

export interface TransaksiRutin {
  id: string;
  user_id: string;
  akun_id: string;
  kategori_id?: string | null;
  tipe: JenisTransaksi;
  jumlah: number;
  keterangan: string;
  tanggal_setiap_bulan: number;
  is_active: boolean;
  auto_generate: boolean;
  terakhir_dijalankan?: string | null;
  created_at: string;
  updated_at: string;

  akun?: Akun;
  kategori?: Kategori;
}

export interface Anggaran {
  id: string;
  user_id: string;
  kategori_id: string;
  bulan: number;
  tahun: number;
  nominal_limit: number;
  created_at: string;
  updated_at: string;

  kategori?: Kategori;
  // Computed property
  terpakai?: number;
}

export interface Tabungan {
  id: string;
  user_id: string;
  nama_target: string;
  target_nominal: number;
  terkumpul: number;
  target_tanggal?: string | null;
  foto_url?: string | null;
  keterangan?: string | null;
  created_at: string;
  updated_at: string;
}
