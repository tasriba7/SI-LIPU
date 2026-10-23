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
  bpd: "Anggota BPD",
  panitia_pilkades: "Panitia Pilkades",
};

export const ROLE_BADGE_CLASS = {
  admin: "bg-red-400/20 text-red-300",
  kepala_desa: "bg-gold/20 text-gold-light",
  sekretaris_desa: "bg-seablue/20 text-seablue",
  kaur: "bg-emerald-400/20 text-emerald-300",
  kasi: "bg-zinc-400/20 text-zinc-300",
  kadus: "bg-purple-400/20 text-purple-300",
  ketua_rt: "bg-orange-400/20 text-orange-300",
  bpd: "bg-teal-400/20 text-teal-300",
  panitia_pilkades: "bg-amber-400/20 text-amber-300",
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
  "bpd",
  "panitia_pilkades",
];

// HANYA "admin" yang boleh: Kelola Akun, Pengaturan Desa, Slot Posisi,
// Pendaftaran Akun. Kepala Desa BUKAN admin.
export const ROLE_ADMIN = ["admin"];

// Kepala Desa dan Anggota BPD hanya melihat (read-only). Semua role lain boleh
// menulis sesuai batas wilayah/modulnya masing-masing.
export const ROLE_HANYA_LIHAT = ["kepala_desa", "bpd"];

// Anggota BPD (Badan Permusyawaratan Desa) = pengawas. Akunnya HANYA LIHAT dan
// hanya dibuat oleh admin (tidak lewat pendaftaran mandiri), karena bisa
// membuka data lengkap warga. Yang dilihat BPD:
//   * pengajuan layanan & pengaduan lewat view `pengajuan_layanan_pantau`
//     (tanpa NIK/No. HP, nama pemohon disamarkan; lihat migrasi 0045),
//   * statistik kependudukan, dan data lengkap warga lewat tombol (tanpa
//     tambah/ubah/hapus/impor/ekspor).
export function isBpdRole(role) {
  return role === "bpd";
}

// Role yang boleh MENERBITKAN surat (simpan nomor + tandai selesai). Samakan
// dengan public.akses_tulis_penuh() di database (migrasi 0017/0020).
// Kepala Desa hanya melihat/mencetak.
export const ROLE_PENERBIT_SURAT = ["admin", "sekretaris_desa", "kaur", "kasi"];

export function bisaTerbitkanSurat(role) {
  return !!role && ROLE_PENERBIT_SURAT.includes(role);
}

// Perangkat KANTOR desa: bekerja untuk seluruh desa, tidak terikat wilayah.
// Kadus & Ketua RT sengaja TIDAK termasuk: mereka hanya mengurus warga di
// wilayahnya sendiri, jadi menu yang berlaku se-desa (kelola jenis layanan,
// galeri, arsip surat terbit, modul surat lama) tidak relevan bagi mereka.
export const ROLE_KANTOR_DESA = [
  "admin",
  "kepala_desa",
  "sekretaris_desa",
  "kaur",
  "kasi",
];

export function isKantorDesaRole(role) {
  return !!role && ROLE_KANTOR_DESA.includes(role);
}

// Role yang menerima PEMBERITAHUAN saat ada pengajuan layanan baru dari warga.
// Sifatnya hanya info (tanpa tombol proses): mereka menyampaikannya ke admin,
// yang memprosesnya. Tambahkan "kadus" di sini kalau Kadus juga perlu menerima.
export const ROLE_PEMBERITAHUAN_LAYANAN = ["kepala_desa", "ketua_rt"];

export function terimaPemberitahuanLayanan(role) {
  return !!role && ROLE_PEMBERITAHUAN_LAYANAN.includes(role);
}

// Tingkat akses sebuah menu/halaman dashboard:
//   "semua"  -> semua staf yang login
//   "kantor" -> perangkat kantor desa (lihat ROLE_KANTOR_DESA)
//   "admin"  -> hanya Administrator
//   "bpd"    -> hanya Anggota BPD (menu pemantauan)
export function bisaLihatMenu(role, akses = "semua") {
  if (!role) return false; // akun tanpa profil staf tidak punya menu apa pun
  if (akses === "pilkades") return isAdminRole(role) || isPanitiaPilkades(role);
  // Panitia hanya melihat menu Pilkades; menu "semua" milik staf desa disembunyikan.
  if (isPanitiaPilkades(role)) return false;
  if (akses === "admin") return isAdminRole(role);
  if (akses === "bpd") return isBpdRole(role);
  if (akses === "kantor") return isKantorDesaRole(role);
  return true;
}

export function isAdminRole(role) {
  return ROLE_ADMIN.includes(role);
}

export function bisaMenulis(role) {
  // Panitia Pilkades TIDAK menulis data warga/layanan; hak tulisnya hanya di
  // modul Pilkades (lihat lib/akses.js: pastikanKelolaPilkades).
  return !!role && !ROLE_HANYA_LIHAT.includes(role) && !isPanitiaPilkades(role);
}

/**
 * Label yang ditampilkan untuk seorang staf: pakai `jabatan` bebas kalau
 * diisi (mis. "Kaur Keuangan"), kalau kosong fallback ke label role umum.
 */
export function labelJabatan(profile) {
  if (!profile) return "";
  return profile.jabatan || ROLE_LABELS[profile.role] || profile.role;
}

// Panitia Pilkades: akun sementara buatan admin. Hanya melihat dan mengelola
// modul Pilkades (periode dibaca, TPS, verifikasi pemilih, cetak daftar).
export function isPanitiaPilkades(role) {
  return role === "panitia_pilkades";
}

// Hanya PANITIA yang mengubah data operasional Pilkades (pemilih, TPS, DPS/DPT,
// calon, daftar hadir). Admin hanya menyiapkan (periode, akun panitia) dan melihat.
export function bisaUbahPilkades(role) {
  return isPanitiaPilkades(role);
}

// Admin atau panitia: boleh MEMBUKA & MELIHAT modul Pilkades.
export function bisaKelolaPilkades(role) {
  return isAdminRole(role) || isPanitiaPilkades(role);
}
