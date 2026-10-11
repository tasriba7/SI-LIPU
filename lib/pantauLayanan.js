// Helper untuk halaman pemantauan layanan (akun Anggota BPD, hanya lihat).
// Data berasal dari view `pengajuan_layanan_pantau` (migrasi 0045): tidak ada
// NIK/No. HP, nama pemohon sudah berupa inisial.

export function lamaTunggu(iso) {
  const menit = Math.floor((Date.now() - new Date(iso).getTime()) / 6e4);
  if (menit < 1) return "baru saja";
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  return `${Math.floor(jam / 24)} hari lalu`;
}

/**
 * Lama penanganan: dari diajukan sampai selesai/ditolak (sudah final), atau
 * sampai sekarang kalau masih berjalan. Dikembalikan sebagai teks pendek.
 */
export function lamaPenanganan({ created_at, updated_at, status }) {
  const akhir = status === "selesai" || status === "ditolak" ? new Date(updated_at) : new Date();
  const jam = Math.max(0, Math.floor((akhir - new Date(created_at)) / 36e5));
  if (jam < 1) return "kurang dari 1 jam";
  if (jam < 24) return `${jam} jam`;
  return `${Math.floor(jam / 24)} hari`;
}

export function formatWaktu(iso) {
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

export const STATUS_PANTAU = ["diajukan", "diproses", "selesai", "ditolak"];
