// Label kolom untuk pemberitahuan "data belum lengkap".
// HARUS sinkron dengan daftar kolom yang dihitung di view
// `warga_kelengkapan` pada supabase/migrations/0015_data_warga_per_wilayah.sql.
// NIK, nama lengkap, dan tanggal lahir tidak masuk di sini karena sudah
// wajib diisi sejak awal (tidak mungkin kosong).

export const LABEL_KOLOM_WARGA = {
  no_kk: "No. KK",
  tempat_lahir: "Tempat lahir",
  jenis_kelamin: "Jenis kelamin",
  status_kawin: "Status kawin",
  status_dalam_kk: "Status dalam KK",
  agama: "Agama",
  pekerjaan: "Pekerjaan",
  alamat: "Alamat",
  dusun: "Dusun",
  rt: "RT",
  rw: "RW",
};

export function labelKolomKosong(kolomKosong) {
  return (kolomKosong ?? []).map((k) => LABEL_KOLOM_WARGA[k] || k);
}

export function ringkasKolomKosong(kolomKosong, maksimal = 3) {
  const label = labelKolomKosong(kolomKosong);
  if (label.length === 0) return "";
  if (label.length <= maksimal) return label.join(", ");
  const sisa = label.length - maksimal;
  return `${label.slice(0, maksimal).join(", ")}, +${sisa} lainnya`;
}
