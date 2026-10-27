// Penjaga TANGGAL tahapan Pilkades: tahap baru boleh dijalankan bila tanggal mulainya
// (di menu Jadwal Tahapan) sudah tiba, walau tahap sebelumnya sudah selesai.
//
// Aturan:
//  - Acuan hari ini = WITA (hariIniWita), bukan jam server.
//  - Hanya tanggal MULAI yang dihitung. Setelah tanggal selesai lewat, tahap tetap boleh dikerjakan.
//  - Tahap yang belum diberi tanggal (atau jadwalnya belum pernah disimpan) TIDAK ditahan,
//    supaya periode lama tetap berjalan.
//  - "pemungutan" memakai tanggal dari menu Periode (pilkades_periode.tanggal_pemungutan).
//  - Gagal membaca jadwal = tidak menahan (sama seperti penjaga urutan di pilkadesKunci.js).
//
// Pekerjaan persiapan (ambil data warga, periksa, atur TPS, tempatkan ke TPS, cetak) tidak ditahan;
// yang ditahan adalah tindakan PENETAPAN/pencatatan resmi:
//   dps -> Tetapkan DPS | dpt -> Tetapkan DPT | calon -> menetapkan status calon
//   pemungutan -> rekap suara TPS & dusun | hasil -> tetapkan calon terpilih

import { hariIniWita, cekBelumWaktunya } from "@/lib/pilkadesJadwal";

const NAMA_BAWAAN = {
  dps: "Penyusunan Daftar Pemilih",
  dpt: "Penetapan Daftar Pemilih Tetap (DPT)",
  calon: "Penetapan Calon & Nomor Urut",
  pemungutan: "Pemungutan & Penghitungan Suara",
  hasil: "Penetapan Calon Terpilih",
};

/** Baca tanggal mulai tiap tahap berjenis untuk satu periode. Hasil: { hariIni, tahap: {jenis: {nama, mulai}} } */
export async function ambilBatasTahap(supabase, periodeId, tanggalPemungutan) {
  const hariIni = hariIniWita();
  const tahap = {};
  try {
    const [jadwal, periode] = await Promise.all([
      supabase.from("pilkades_jadwal").select("jenis, nama, mulai").eq("periode_id", periodeId).not("jenis", "is", null),
      tanggalPemungutan === undefined
        ? supabase.from("pilkades_periode").select("tanggal_pemungutan").eq("id", periodeId).maybeSingle()
        : Promise.resolve({ data: { tanggal_pemungutan: tanggalPemungutan } }),
    ]);
    if (jadwal.error) return { hariIni, tahap: {} };
    for (const r of jadwal.data ?? []) tahap[r.jenis] = { nama: r.nama, mulai: r.mulai || null };
    const tgl = periode.data?.tanggal_pemungutan || null;
    tahap.pemungutan = { nama: tahap.pemungutan?.nama ?? NAMA_BAWAAN.pemungutan, mulai: tgl };
  } catch {
    return { hariIni, tahap: {} };
  }
  return { hariIni, tahap };
}

/** Dari hasil ambilBatasTahap: { jenis: {mulai, pesan} } hanya untuk tahap yang BELUM waktunya. */
export function hitungTertunda(batas) {
  const hasil = {};
  for (const jenis of Object.keys(NAMA_BAWAAN)) {
    const t = batas.tahap[jenis];
    if (!t) continue;
    const c = cekBelumWaktunya({ nama: t.nama || NAMA_BAWAAN[jenis], mulai: t.mulai }, batas.hariIni);
    if (c) hasil[jenis] = c;
  }
  return hasil;
}

/** Satu jenis tahap: null bila boleh, atau { mulai, pesan } bila belum waktunya. */
export async function tundaSebelumJadwal(supabase, periodeId, jenis, tanggalPemungutan) {
  const batas = await ambilBatasTahap(supabase, periodeId, tanggalPemungutan);
  return hitungTertunda(batas)[jenis] ?? null;
}
