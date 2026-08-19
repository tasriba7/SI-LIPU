// Tipe field yang didukung Form Builder (docs/DATABASE_SCHEMA.md).
// Dipakai di panel admin (susun form) & form publik (render form dinamis).
export const TIPE_FIELD = [
  { value: "teks_pendek", label: "Teks pendek" },
  { value: "teks_panjang", label: "Teks panjang" },
  { value: "angka", label: "Angka" },
  { value: "tanggal", label: "Tanggal" },
  { value: "pilihan", label: "Pilihan (dropdown)" },
  // upload_file belum didukung penuh (butuh Supabase Storage) — field ini
  // sengaja belum ditawarkan di Form Builder supaya tidak menjanjikan
  // fitur yang belum benar-benar jalan. Tambahkan lagi setelah modul
  // Storage dibangun.
];

export const KATEGORI_LAYANAN = [
  { value: "surat", label: "Surat" },
  { value: "pengaduan", label: "Pengaduan" },
  { value: "bansos", label: "Bantuan Sosial" },
  { value: "lainnya", label: "Lainnya" },
];

export const ICON_LAYANAN = [
  { value: "mail", label: "Amplop (surat)" },
  { value: "message", label: "Pesan (pengaduan)" },
  { value: "megaphone", label: "Pengumuman" },
  { value: "users", label: "Orang (kependudukan/bansos)" },
];
