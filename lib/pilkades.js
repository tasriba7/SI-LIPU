// Konstanta & helper modul Pilkades (tahap 1).

export const STATUS_VERIFIKASI = {
  belum: "Belum diperiksa",
  memenuhi_syarat: "Memenuhi syarat",
  tidak_memenuhi: "Tidak memenuhi syarat",
  perlu_dicek: "Perlu dicek",
};

export const STATUS_BADGE_CLASS = {
  belum: "bg-slate-100 text-slate-600",
  memenuhi_syarat: "bg-emerald-100 text-emerald-700",
  tidak_memenuhi: "bg-red-100 text-red-700",
  perlu_dicek: "bg-amber-100 text-amber-700",
};

/** Periode aktif (kalau tidak ada: periode terbaru). */
export async function ambilPeriode(supabase) {
  const { data } = await supabase
    .from("pilkades_periode")
    .select("id, nama, tanggal_pemungutan, aktif, usia_minimum, termasuk_pernah_kawin")
    .order("aktif", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

/** Umur (tahun penuh) pada tanggal acuan. */
export function hitungUmur(tanggalLahir, acuan = new Date()) {
  if (!tanggalLahir) return null;
  const l = new Date(tanggalLahir);
  let umur = acuan.getFullYear() - l.getFullYear();
  const belumUlangTahun =
    acuan.getMonth() < l.getMonth() ||
    (acuan.getMonth() === l.getMonth() && acuan.getDate() < l.getDate());
  if (belumUlangTahun) umur -= 1;
  return umur;
}

/**
 * Calon pemilih yang usianya di bawah batas periode (usia_minimum) pada tanggal
 * acuan TIDAK ditampilkan/dicetak, dari usia hampir cukup sampai 0 tahun.
 * Pengecualian: yang sudah berstatus "Memenuhi syarat" (mis. lolos lewat aturan kawin).
 */
export function terlaluMuda(r, periode, acuan) {
  const umur = hitungUmur(r.tanggal_lahir, acuan);
  if (umur === null) return false;
  return umur < (periode.usia_minimum ?? 17) && r.status_verifikasi !== "memenuhi_syarat";
}

export function formatTanggal(t) {
  if (!t) return "-";
  return new Date(t).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export const JENIS_DAFTAR_LABEL = {
  DPS: "Daftar Pemilih Sementara (DPS)",
  DPT: "Daftar Pemilih Tetap (DPT)",
};

export const AKSI_LABEL = {
  ambil_calon_pemilih: "Ambil calon pemilih",
  tetapkan_dps: "Tetapkan DPS",
  tetapkan_dpt: "Tetapkan DPT",
  terapkan_filter_usia: "Terapkan filter usia",
  cetak_draf: "Cetak draf",
  cetak_arsip: "Cetak daftar resmi",
};

/**
 * PostgREST membatasi satu respons (default 1000 baris). Helper ini mengambil
 * semua baris per 1000. `buat` harus membuat query BARU (dengan urutan stabil)
 * setiap dipanggil.
 */
export async function ambilSemuaBaris(buat) {
  const ukuran = 1000;
  let semua = [];
  for (let dari = 0; ; dari += ukuran) {
    const { data, error } = await buat().range(dari, dari + ukuran - 1);
    if (error) return { data: null, error };
    semua = semua.concat(data ?? []);
    if (!data || data.length < ukuran) break;
  }
  return { data: semua, error: null };
}

export function ambilDaftarPemilih(supabase, periodeId) {
  return ambilSemuaBaris(() =>
    supabase.rpc("pilkades_daftar_pemilih", { p_periode: periodeId })
  );
}

export function ambilIsiArsip(supabase, daftarId) {
  return ambilSemuaBaris(() =>
    supabase
      .from("pilkades_daftar_tetap_isi")
      .select("id, urut, nama_lengkap, nik_samar, jenis_kelamin, tempat_lahir, tanggal_lahir, dusun, rt, rw, alamat, tps_nama")
      .eq("daftar_id", daftarId)
      .order("urut")
  );
}
