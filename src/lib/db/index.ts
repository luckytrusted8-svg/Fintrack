import Dexie, { Table, IndexableType } from 'dexie';

export type JenisAkun = 'bank' | 'cash' | 'ewallet' | 'investasi' | 'lainnya';
export type JenisTransaksi = 'pemasukan' | 'pengeluaran' | 'transfer';
export type TipeKategori = 'pemasukan' | 'pengeluaran';

export interface Akun {
  id?: string;
  nama: string;
  jenis: JenisAkun;
  icon?: string;
  nomor_rekening?: string;
  saldo_awal: number;
  saldo_sekarang: number;
  warna_hex: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Kategori {
  id?: string;
  nama: string;
  tipe: TipeKategori;
  icon?: string;
  warna_hex: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaksi {
  id?: string;
  akun_id: string;
  target_akun_id?: string;
  kategori_id?: string;
  tanggal: string; // YYYY-MM-DD
  tipe: JenisTransaksi;
  jumlah: number;
  keterangan?: string;
  foto_url?: string; // Base64 data string / blob url
  created_at: string;
  updated_at: string;

  // Joined fields for display
  akun?: Akun;
  target_akun?: Akun;
  kategori?: Kategori;
}

export interface TransaksiRutin {
  id?: string;
  akun_id: string;
  kategori_id?: string;
  tipe: JenisTransaksi;
  jumlah: number;
  keterangan: string;
  tanggal_setiap_bulan: number;
  is_active: boolean;
  auto_generate: boolean;
  terakhir_dijalankan?: string;
  created_at: string;
  updated_at: string;

  akun?: Akun;
  kategori?: Kategori;
}

export interface Anggaran {
  id?: string;
  kategori_id: string;
  bulan: number;
  tahun: number;
  nominal_limit: number;
  created_at: string;
  updated_at: string;

  kategori?: Kategori;
  terpakai?: number;
}

export interface Tabungan {
  id?: string;
  nama_target: string;
  target_nominal: number;
  terkumpul: number;
  target_tanggal?: string;
  foto_url?: string;
  keterangan?: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id?: string;
  nama_lengkap: string;
  email?: string;
  pin_code?: string;
  mata_uang: string;
  created_at: string;
}

export class FintrackDatabase extends Dexie {
  akun!: Table<Akun>;
  kategori!: Table<Kategori>;
  transaksi!: Table<Transaksi>;
  transaksi_rutin!: Table<TransaksiRutin>;
  anggaran!: Table<Anggaran>;
  tabungan!: Table<Tabungan>;
  user_profile!: Table<UserProfile>;

  constructor() {
    super('fintrack_local_db');
    this.version(1).stores({
      akun: '++id, nama, jenis, is_active, created_at',
      kategori: '++id, nama, tipe, is_default, created_at',
      transaksi: '++id, akun_id, target_akun_id, kategori_id, tanggal, tipe, created_at',
      transaksi_rutin: '++id, akun_id, kategori_id, tipe, tanggal_setiap_bulan, is_active',
      anggaran: '++id, [kategori_id+bulan+tahun], bulan, tahun, kategori_id',
      tabungan: '++id, nama_target, created_at',
      user_profile: '++id, email',
    });
    this.version(2).stores({
      anggaran: '++id, [bulan+tahun], [kategori_id+bulan+tahun], bulan, tahun, kategori_id',
    });
  }
}

export const db = new FintrackDatabase();

/**
 * Hitung ulang saldo terkini akun secara real-time dari saldo awal + seluruh mutasi transaksi.
 * Menangani konversi ID angka maupun string agar 100% akurat di IndexedDB.
 */
export async function recalculateAccountBalance(accountId: string | number): Promise<void> {
  if (accountId === undefined || accountId === null || accountId === '') return;

  const strId = accountId.toString();
  const numId = Number(accountId);

  let account = !isNaN(numId) ? await db.akun.get(numId) : undefined;
  if (!account) {
    account = await db.akun.get(strId as unknown as IndexableType);
  }
  if (!account) {
    const all = await db.akun.toArray();
    account = all.find((a) => a.id !== undefined && a.id.toString() === strId);
  }
  if (!account || account.id === undefined) return;

  const targetIdStr = account.id.toString();
  const allTx = await db.transaksi.toArray();

  let pemasukan = 0;
  let pengeluaran = 0;
  let transferMasuk = 0;
  let transferKeluar = 0;

  allTx.forEach((tx) => {
    const amount = Number(tx.jumlah) || 0;
    const txAkunIdStr = tx.akun_id !== undefined ? String(tx.akun_id) : '';
    const txTargetAkunIdStr = tx.target_akun_id !== undefined ? String(tx.target_akun_id) : '';

    if (txAkunIdStr === targetIdStr) {
      if (tx.tipe === 'pemasukan') {
        pemasukan += amount;
      } else if (tx.tipe === 'pengeluaran') {
        pengeluaran += amount;
      } else if (tx.tipe === 'transfer') {
        transferKeluar += amount;
      }
    }

    if (tx.tipe === 'transfer' && txTargetAkunIdStr === targetIdStr) {
      transferMasuk += amount;
    }
  });

  const saldoSekarang = Number(account.saldo_awal || 0) + pemasukan - pengeluaran + transferMasuk - transferKeluar;

  await db.akun.update(account.id, {
    saldo_sekarang: saldoSekarang,
    updated_at: new Date().toISOString(),
  });
}

/**
 * Hitung ulang seluruh saldo akun yang ada di sistem
 */
export async function recalculateAllAccountBalances(): Promise<void> {
  const allAccounts = await db.akun.toArray();
  for (const acc of allAccounts) {
    if (acc.id !== undefined) {
      await recalculateAccountBalance(acc.id);
    }
  }
}

/**
 * Inisialisasi kategori bawaan (is_default: true) hanya saat database pertama kali dibuat.
 * Tanpa transaksi atau saldo dummy sama sekali!
 */
export async function initializeDatabaseDefaults(): Promise<void> {
  const count = await db.kategori.count();
  if (count > 0) return;

  const now = new Date().toISOString();

  // Kategori Pengeluaran Umum
  const defaultExpenses = [
    { nama: 'Makanan & Minuman', icon: 'utensils', warna_hex: '#F43F5E' },
    { nama: 'Transportasi', icon: 'car', warna_hex: '#FB923C' },
    { nama: 'Kebutuhan Rumah', icon: 'home', warna_hex: '#FBBF24' },
    { nama: 'Tagihan & Langganan', icon: 'receipt', warna_hex: '#A855F7' },
    { nama: 'Hiburan & Hobi', icon: 'gamepad-2', warna_hex: '#EC4899' },
    { nama: 'Kesehatan', icon: 'heart-pulse', warna_hex: '#06B6D4' },
    { nama: 'Pendidikan', icon: 'graduation-cap', warna_hex: '#3B82F6' },
    { nama: 'Belanja Pribadi', icon: 'shopping-bag', warna_hex: '#10B981' },
    { nama: 'Lain-lain', icon: 'more-horizontal', warna_hex: '#6B7280' },
  ];

  // Kategori Pemasukan Umum
  const defaultIncomes = [
    { nama: 'Gaji Utama', icon: 'briefcase', warna_hex: '#10B981' },
    { nama: 'Pekerjaan Sampingan', icon: 'laptop', warna_hex: '#34D399' },
    { nama: 'Bonus & THR', icon: 'gift', warna_hex: '#F59E0B' },
    { nama: 'Investasi & Bunga', icon: 'trending-up', warna_hex: '#06B6D4' },
    { nama: 'Pemasukan Lainnya', icon: 'plus-circle', warna_hex: '#6B7280' },
  ];

  for (const exp of defaultExpenses) {
    await db.kategori.add({
      nama: exp.nama,
      tipe: 'pengeluaran',
      icon: exp.icon,
      warna_hex: exp.warna_hex,
      is_default: true,
      created_at: now,
      updated_at: now,
    });
  }

  for (const inc of defaultIncomes) {
    await db.kategori.add({
      nama: inc.nama,
      tipe: 'pemasukan',
      icon: inc.icon,
      warna_hex: inc.warna_hex,
      is_default: true,
      created_at: now,
      updated_at: now,
    });
  }

  // Profil pengguna awal
  const profileCount = await db.user_profile.count();
  if (profileCount === 0) {
    await db.user_profile.add({
      nama_lengkap: 'Pengguna Fintrack',
      mata_uang: 'IDR',
      created_at: now,
    });
  }
}

/**
 * Export seluruh data database ke format JSON untuk backup mandiri
 */
export async function exportDatabaseBackup(): Promise<string> {
  const backup = {
    version: 1,
    exported_at: new Date().toISOString(),
    akun: await db.akun.toArray(),
    kategori: await db.kategori.toArray(),
    transaksi: await db.transaksi.toArray(),
    transaksi_rutin: await db.transaksi_rutin.toArray(),
    anggaran: await db.anggaran.toArray(),
    tabungan: await db.tabungan.toArray(),
    user_profile: await db.user_profile.toArray(),
  };

  return JSON.stringify(backup, null, 2);
}

/**
 * Restore data database dari file backup JSON
 */
export async function importDatabaseBackup(jsonString: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonString);
    if (!data.akun || !data.kategori || !data.transaksi) {
      throw new Error('Format file backup tidak valid.');
    }

    await db.transaction('rw', [
      db.akun,
      db.kategori,
      db.transaksi,
      db.transaksi_rutin,
      db.anggaran,
      db.tabungan,
      db.user_profile,
    ], async () => {
      await db.akun.clear();
      await db.kategori.clear();
      await db.transaksi.clear();
      await db.transaksi_rutin.clear();
      await db.anggaran.clear();
      await db.tabungan.clear();
      await db.user_profile.clear();

      if (data.akun.length) await db.akun.bulkAdd(data.akun);
      if (data.kategori.length) await db.kategori.bulkAdd(data.kategori);
      if (data.transaksi.length) await db.transaksi.bulkAdd(data.transaksi);
      if (data.transaksi_rutin?.length) await db.transaksi_rutin.bulkAdd(data.transaksi_rutin);
      if (data.anggaran?.length) await db.anggaran.bulkAdd(data.anggaran);
      if (data.tabungan?.length) await db.tabungan.bulkAdd(data.tabungan);
      if (data.user_profile?.length) await db.user_profile.bulkAdd(data.user_profile);
    });

    return true;
  } catch (err) {
    console.error('Gagal import backup:', err);
    return false;
  }
}
