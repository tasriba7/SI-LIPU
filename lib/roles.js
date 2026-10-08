// Label & warna badge untuk role perangkat desa.
// Dipakai di dashboard supaya konsisten di semua halaman.

export const ROLE_LABELS = {
  admin: "Administrator",
  kepala_desa: "Kepala Desa",
  sekretaris_desa: "Sekretaris Desa",
  kaur: "Kepala Urusan (Kaur)",
  kasi: "Kepala Seksi (Kasi)",
  kadus: "Kepala Dusun (Kadus)",
  ketua_rt: "Ketua RT",
};

export const ROLE_BADGE_CLASS = {
  admin: "bg-red-400/20 text-red-300",
  kepala_desa: "bg-gold/20 text-gold-light",
  sekretaris_desa: "bg-seablue/20 text-seablue",
  kaur: "bg-emerald-400/20 text-emerald-300",
  kasi: "bg-sky-400/20 text-sky-300",
  kadus: "bg-purple-400/20 text-purple-300",
  ketua_rt: "bg-orange-400/20 text-orange-300",
};

// Role yang bisa didaftarkan lewat sistem slot posisi & pendaftaran mandiri
// (admin membuat slot, calon pemegang mendaftar, admin menyetujui).
// Kepala Desa ikut di sini: akunnya bisa lahir dari pengajuan seperti Kadus,
// atau dibuatkan langsung oleh admin lewat Kelola Akun Staf.
export const ROLE_SLOT = ["kepala_desa", "kadus", "ketua_rt"];

// Role yang terikat ke wilayah (dusun / RT-RW) sehingga datanya dibatasi.
export const ROLE_BUTUH_WILAYAH = ["kadus", "ketua_rt"];

// Role yang boleh dibuat langsung oleh admin lewat Kelola Akun Staf.
export const ROLE_BISA_DIBUAT_ADMIN = [
  "admin",
  "kepala_desa",
  "sekretaris_desa",
  "kaur",
  "kasi",
];

// HANYA "admin" yang boleh: Kelola Akun, Pengaturan Desa, Slot Posisi,
// Pendaftaran Akun. Kepala Desa BUKAN admin.
export const ROLE_ADMIN = ["admin"];

// Kepala Desa hanya melihat (read-only). Semua role lain boleh menulis
// sesuai batas wilayah/modulnya masing-masing.
export const ROLE_HANYA_LIHAT = ["kepala_desa"];

// Role yang boleh MENERBITKAN surat (simpan nomor + tandai selesai). Samakan
// dengan public.akses_tulis_penuh() di database (migrasi 0017/0020).
// Kepala Desa hanya melihat/mencetak.
export const ROLE_PENERBIT_SURAT = ["admin", "sekretaris_desa", "kaur", "kasi"];

export function bisaTerbitkanSurat(role) {
  return !!role && ROLE_PENERBIT_SURAT.includes(role);
}

export function isAdminRole(role) {
  return ROLE_ADMIN.includes(role);
}

export function bisaMenulis(role) {
  return !!role && !ROLE_HANYA_LIHAT.includes(role);
}

/**
 * Label yang ditampilkan untuk seorang staf: pakai `jabatan` bebas kalau
 * diisi (mis. "Kaur Keuangan"), kalau kosong fallback ke label role umum.
 */
export function labelJabatan(profile) {
  if (!profile) return "";
  return profile.jabatan || ROLE_LABELS[profile.role] || profile.role;
}
