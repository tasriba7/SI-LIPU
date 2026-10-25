import { isAdminRole } from "@/lib/roles";

/**
 * Pesan hasil aksi untuk modul Pilkades — satu tempat, satu gaya bahasa.
 *
 * Peta pesan tiap halaman berbentuk { kode: [jenis, judul, isi] }
 * (atau fungsi (sp) => [jenis, judul, isi] bila isinya memuat nama/angka).
 * jenis: "sukses" | "perhatian" | "bahaya" | "info".
 */

export const COBA_LAGI = "Silakan coba lagi. Bila tetap gagal, hubungi Administrator desa.";

/** Info teknis (nomor migrasi) hanya untuk Administrator; panitia tidak perlu melihatnya. */
export function teknis(role, ...migrasi) {
  if (!isAdminRole(role) || migrasi.length === 0) return "";
  return ` (Untuk Administrator: pastikan migrasi ${migrasi.join(", ")} sudah dijalankan di Supabase.)`;
}

/** Ambil pesan dari peta berdasarkan ?hasil=... pada alamat halaman. */
export function pesanDari(peta, sp) {
  const p = peta[sp?.hasil];
  if (!p) return null;
  const [jenis, judul, isi] = typeof p === "function" ? p(sp) : p;
  return { jenis, judul, isi: isi ?? "" };
}
