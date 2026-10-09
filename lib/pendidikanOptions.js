// Pendidikan terakhir — mengikuti pilihan standar KK/KTP-el (Dukcapil).
// Dipakai bersama oleh form Tambah/Edit Warga, impor Excel, dan halaman
// Detail Keluarga supaya urutan & penulisannya konsisten.
// Urutan = dari yang terendah ke tertinggi (dipakai juga untuk mengurutkan
// ringkasan pendidikan di Detail Keluarga).
export const PENDIDIKAN_OPTIONS = [
  "Tidak/Belum Sekolah",
  "Belum Tamat SD/Sederajat",
  "Tamat SD/Sederajat",
  "SLTP/Sederajat",
  "SLTA/Sederajat",
  "Diploma I/II",
  "Akademi/Diploma III/Sarjana Muda",
  "Diploma IV/Strata I",
  "Strata II",
  "Strata III",
];

export function urutanPendidikan(nilai) {
  const i = PENDIDIKAN_OPTIONS.indexOf(nilai);
  return i === -1 ? PENDIDIKAN_OPTIONS.length : i;
}
