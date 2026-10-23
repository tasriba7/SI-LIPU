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
    .select("id, nama, tanggal_pemungutan, aktif")
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

export function formatTanggal(t) {
  if (!t) return "-";
  return new Date(t).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
