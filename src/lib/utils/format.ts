/**
 * Format currency to Indonesian Rupiah (Rp)
 */
export function formatRupiah(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'Rp 0';
  }
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  return formatted.replace(/\s+/g, ' ');
}

/**
 * Format date in Indonesian locale (e.g. "24 Sep 2026", "Hari ini", "Kemarin")
 */
export function formatTanggal(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  
  // Format normalized YYYY-MM-DD for comparison
  const dateKey = date.toISOString().split('T')[0];
  const nowKey = now.toISOString().split('T')[0];

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().split('T')[0];

  if (dateKey === nowKey) {
    return 'Hari ini';
  }
  if (dateKey === yesterdayKey) {
    return 'Kemarin';
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/**
 * Format date for input field value (YYYY-MM-DD)
 */
export function toInputDateFormat(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get Indonesian month name
 */
export function getNamaBulan(monthNumber: number): string {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return months[monthNumber - 1] || '';
}
