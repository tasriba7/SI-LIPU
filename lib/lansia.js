// Batas lansia = 60 tahun ke atas (UU No. 13/1998 tentang Kesejahteraan
// Lanjut Usia). Label ini HARUS sama dengan label kelompok usia di
// supabase/migrations/0027_kelompok_usia_lansia_60.sql.
export const BATAS_LANSIA = 60;
export const KELOMPOK_LANSIA = "60+ Tahun";

/**
 * Ambil jumlah lansia dari daftar kelompok usia [{ label, jumlah }].
 * `tersedia` = false kalau kelompok "60+ Tahun" belum ada, yaitu migrasi
 * 0027 belum dijalankan dan database masih memakai kelompok lama (65+).
 * Dengan begitu tampilan tidak pernah memasang angka yang salah.
 */
export function cariLansia(perRentangUsia) {
  const baris = (perRentangUsia ?? []).find((r) => r.label === KELOMPOK_LANSIA);
  return { tersedia: !!baris, jumlah: baris?.jumlah ?? 0 };
}
