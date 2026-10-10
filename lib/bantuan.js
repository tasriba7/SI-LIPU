// Konstanta & helper untuk modul Bantuan Desa (admin + halaman cek warga).

export const KATEGORI_BANTUAN = [
  { nilai: "tunai", label: "Bantuan Tunai" },
  { nilai: "pangan", label: "Pangan" },
  { nilai: "kesehatan", label: "Kesehatan" },
  { nilai: "pendidikan", label: "Pendidikan" },
  { nilai: "perumahan", label: "Perumahan & Listrik" },
  { nilai: "usaha", label: "Usaha & Mata Pencaharian" },
  { nilai: "sosial", label: "Sosial" },
  { nilai: "lainnya", label: "Lainnya" },
];

export const KATEGORI_LABEL = Object.fromEntries(
  KATEGORI_BANTUAN.map((k) => [k.nilai, k.label])
);

export const KATEGORI_BADGE_CLASS = {
  tunai: "bg-emerald-100 text-emerald-700",
  pangan: "bg-amber-100 text-amber-700",
  kesehatan: "bg-rose-100 text-rose-700",
  pendidikan: "bg-sky-100 text-sky-700",
  perumahan: "bg-orange-100 text-orange-700",
  usaha: "bg-violet-100 text-violet-700",
  sosial: "bg-teal-100 text-teal-700",
  lainnya: "bg-slate-100 text-slate-600",
};

// "Dusun 2 · RT 01/RW 02" dari kolom wilayah warga (kolom kosong dilewati).
export function labelWilayahWarga({ dusun, rt, rw } = {}) {
  const bagian = [];
  if (dusun) bagian.push(/^dusun\b/i.test(dusun) ? dusun : `Dusun ${dusun}`);
  if (rt || rw) bagian.push(`RT ${rt || "-"}/RW ${rw || "-"}`);
  return bagian.join(" · ") || "-";
}

export function labelPeriode(periode) {
  return periode && periode.trim() ? periode : "Tanpa periode";
}
