// Penjaga TANGGAL tahapan Pilkades: tahap baru boleh dijalankan bila tanggal mulainya
// (di menu Jadwal & Pengaturan (tab Jadwal Tahapan)) sudah tiba, walau tahap sebelumnya sudah selesai.
//
// Aturan:
//  - Acuan hari ini = WITA (hariIniWita), bukan jam server.
//  - Hanya tanggal MULAI yang dihitung. Setelah tanggal selesai lewat, tahap tetap boleh dikerjakan.
//  - Tahap yang belum diberi tanggal (atau jadwalnya belum pernah disimpan) DITAHAN:
//    panitia harus menyiapkan pengaturan dan jadwal dulu, baru tahap bisa dijalankan.
//  - Pengaturan yang harus siap: tanggal pemungutan (menu Periode) dan Susunan Panitia.
//  - "pemungutan" memakai tanggal dari menu Periode (pilkades_periode.tanggal_pemungutan).
//  - Gagal membaca jadwal = tidak menahan (sama seperti penjaga urutan di pilkadesKunci.js).
//
// Yang ditahan: pekerjaan persiapan DAN penetapan resmi.
//   dps -> Ambil Data Warga, Periksa Pemilih, Atur TPS, Tempatkan ke TPS, Tetapkan DPS
//          (semuanya tercakup tahap "Penyusunan Daftar Pemilih")
//   dpt -> Tetapkan DPT | calon -> menetapkan status calon
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
    if (jadwal.error) return { hariIni, tahap: {}, gagal: true };
    for (const r of jadwal.data ?? []) tahap[r.jenis] = { nama: r.nama, mulai: r.mulai || null };
    const tgl = periode.data?.tanggal_pemungutan || null;
    tahap.pemungutan = { nama: tahap.pemungutan?.nama ?? NAMA_BAWAAN.pemungutan, mulai: tgl };
  } catch {
    return { hariIni, tahap: {}, gagal: true };
  }
  return { hariIni, tahap, gagal: false };
}

/**
 * Kesiapan pengaturan + jadwal satu periode. Gagal membaca = TIDAK menahan (gagal: true).
 *  pemungutanDiisi : tanggal pemungutan (menu Periode, Administrator) sudah ada
 *  panitiaAda      : Susunan Panitia sudah berisi
 *  tahap           : { jenis: {nama, mulai} } dari Jadwal Tahapan
 */
export async function ambilKesiapan(supabase, periodeId, tanggalPemungutan) {
  const batas = await ambilBatasTahap(supabase, periodeId, tanggalPemungutan);
  let panitiaAda = true;
  let gagal = batas.gagal;
  try {
    const { count, error } = await supabase
      .from("pilkades_panitia")
      .select("id", { count: "exact", head: true })
      .eq("periode_id", periodeId);
    if (error) gagal = true;
    else panitiaAda = (count ?? 0) > 0;
  } catch {
    gagal = true;
  }
  return {
    gagal,
    hariIni: batas.hariIni,
    pemungutanDiisi: Boolean(batas.tahap.pemungutan?.mulai),
    panitiaAda,
    tahap: batas.tahap,
  };
}

export const NAMA_TAHAP_BAWAAN = NAMA_BAWAAN;

/**
 * Alasan sebuah tahap (jenis) BELUM boleh dijalankan, atau null bila boleh.
 * Urutan pemeriksaan: tanggal pemungutan -> susunan panitia -> tahap sudah dijadwalkan -> tanggal mulai tiba.
 * Hasil: { kode, pesan, mulai? }.
 */
export function alasanTertahan(k, jenis) {
  if (!k || k.gagal) return null;
  if (!k.pemungutanDiisi) {
    return {
      kode: "periode",
      pesan:
        "Pengaturan belum lengkap: tanggal pemungutan suara belum diisi. Hanya Administrator desa yang dapat mengisinya, di menu Periode Pilkades. Tahapan baru bisa dijalankan setelah pengaturan dan jadwal disiapkan.",
    };
  }
  if (!k.panitiaAda) {
    return {
      kode: "panitia",
      pesan: "Pengaturan belum lengkap: Susunan Panitia belum diisi. Isi dulu di menu Susunan Panitia, baru tahapan bisa dijalankan.",
    };
  }
  const t = k.tahap?.[jenis];
  const nama = t?.nama || NAMA_BAWAAN[jenis] || jenis;
  if (!t || !t.mulai) {
    return {
      kode: "jadwal",
      pesan: `Jadwal belum diisi: tahap “${nama}” belum punya tanggal mulai. Isi dulu di menu Jadwal & Pengaturan (tab Jadwal Tahapan), karena tahapan hanya bisa dijalankan sesuai jadwal.`,
    };
  }
  const c = cekBelumWaktunya({ nama, mulai: t.mulai }, k.hariIni);
  return c ? { kode: "tanggal", ...c } : null;
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

/**
 * Satu jenis tahap: null bila boleh, atau { kode, pesan, ... } bila belum boleh dijalankan
 * (pengaturan/jadwal belum diisi, atau tanggal mulainya belum tiba).
 */
export async function tundaSebelumJadwal(supabase, periodeId, jenis, tanggalPemungutan) {
  const k = await ambilKesiapan(supabase, periodeId, tanggalPemungutan);
  return alasanTertahan(k, jenis);
}

/**
 * Penjaga untuk pekerjaan PERSIAPAN daftar pemilih (ambil data warga, periksa, TPS, tempatkan).
 * Tahap acuannya "Penyusunan Daftar Pemilih" (jenis dps). Setelah DPS/DPT ditetapkan, tidak menahan lagi
 * (daftar resmi sudah ada). Mengembalikan null bila boleh.
 */
export async function tundaPersiapan(supabase, periodeId) {
  try {
    const { count } = await supabase
      .from("pilkades_daftar_tetap")
      .select("id", { count: "exact", head: true })
      .eq("periode_id", periodeId);
    if ((count ?? 0) > 0) return null;
  } catch {
    return null;
  }
  return tundaSebelumJadwal(supabase, periodeId, "dps");
}
