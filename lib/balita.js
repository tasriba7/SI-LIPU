// Balita = bawah lima tahun (0-4 tahun, yaitu 0-59 bulan). Label ini HARUS
// sama dengan label kelompok usia di
// supabase/migrations/0031_kelompok_usia_balita.sql.
export const BATAS_BALITA = 5; // balita = usia di bawah 5 tahun
export const KELOMPOK_BALITA = "0-4 Tahun";

/**
 * Ambil jumlah balita dari daftar kelompok usia [{ label, jumlah }].
 * `tersedia` = false kalau kelompok "0-4 Tahun" belum ada, yaitu migrasi
 * 0031 belum dijalankan dan database masih memakai kelompok lama (0-6).
 * Dengan begitu tampilan tidak pernah memasang angka yang salah.
 */
export function cariBalita(perRentangUsia) {
  const baris = (perRentangUsia ?? []).find((r) => r.label === KELOMPOK_BALITA);
  return { tersedia: !!baris, jumlah: baris?.jumlah ?? 0 };
}
