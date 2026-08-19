// Label & warna badge untuk role perangkat desa.
// Dipakai di dashboard supaya konsisten di semua halaman.

export const ROLE_LABELS = {
  kepala_desa: "Kepala Desa",
  sekretaris_desa: "Sekretaris Desa",
  kaur: "Kepala Urusan (Kaur)",
  kasi: "Kepala Seksi (Kasi)",
  kadus: "Kepala Dusun (Kadus)",
  ketua_rt: "Ketua RT",
};

export const ROLE_BADGE_CLASS = {
  kepala_desa: "bg-gold/20 text-gold-light",
  sekretaris_desa: "bg-seablue/20 text-seablue",
  kaur: "bg-emerald-400/20 text-emerald-300",
  kasi: "bg-sky-400/20 text-sky-300",
  kadus: "bg-purple-400/20 text-purple-300",
  ketua_rt: "bg-orange-400/20 text-orange-300",
};

// Role yang punya banyak slot per wilayah (dikelola lewat sistem posisi &
// pendaftaran mandiri). Role di luar ini (kepala_desa, sekretaris_desa,
// kaur, kasi) dibuat manual oleh admin lewat Supabase Dashboard.
export const ROLE_BUTUH_WILAYAH = ["kadus", "ketua_rt"];

/**
 * Label yang ditampilkan untuk seorang staf: pakai `jabatan` bebas kalau
 * diisi (mis. "Kaur Keuangan"), kalau kosong fallback ke label role umum.
 */
export function labelJabatan(profile) {
  if (!profile) return "";
  return profile.jabatan || ROLE_LABELS[profile.role] || profile.role;
}
