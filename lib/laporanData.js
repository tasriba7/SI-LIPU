// Konstanta fitur "Data Saya" + laporan data keliru (migrasi 0038).
// Dipakai halaman publik /layanan/data-saya dan kotak masuk admin.

// Bagian data yang bisa dipilih warga saat melapor. Nilai disimpan sebagai teks
// biasa di laporan_data_warga.bagian_data; daftar ini juga menjadi whitelist di
// server (nilai lain ditolak), jadi klien tidak bisa menyisipkan teks bebas.
export const BAGIAN_DATA = [
  "Nama lengkap",
  "NIK",
  "Nomor KK",
  "Tempat lahir",
  "Tanggal lahir",
  "Jenis kelamin",
  "Alamat / Dusun / RT / RW",
  "Status perkawinan",
  "Pekerjaan",
  "Agama",
  "Pendidikan",
  "Nomor HP",
  "Lainnya",
];

export const STATUS_LAPORAN = ["baru", "diproses", "selesai", "ditolak"];

export const STATUS_LAPORAN_LABEL = {
  baru: "Baru",
  diproses: "Diproses",
  selesai: "Selesai",
  ditolak: "Ditolak",
};

export const STATUS_LAPORAN_BADGE = {
  baru: "bg-amber-100 text-amber-800",
  diproses: "bg-blue-100 text-blue-800",
  selesai: "bg-emerald-100 text-emerald-800",
  ditolak: "bg-red-100 text-red-700",
};

export const PESAN_MIN = 10;
export const PESAN_MAKS = 1000;
