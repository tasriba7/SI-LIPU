// Helper data APBDes (Anggaran Pendapatan dan Belanja Desa). Dipakai halaman
// publik /apbdes, ringkasan di beranda, dan panel admin /dashboard/apbdes.

export const JENIS_APBDES = [
  { nilai: "pendapatan", label: "Pendapatan", contoh: "mis. Dana Desa, Alokasi Dana Desa" },
  { nilai: "belanja", label: "Belanja", contoh: "mis. Bidang Pembangunan Desa" },
  { nilai: "pembiayaan_penerimaan", label: "Pembiayaan — Penerimaan", contoh: "mis. SiLPA tahun sebelumnya" },
  { nilai: "pembiayaan_pengeluaran", label: "Pembiayaan — Pengeluaran", contoh: "mis. Penyertaan modal BUMDes" },
];

export function labelJenis(nilai) {
  return JENIS_APBDES.find((j) => j.nilai === nilai)?.label ?? nilai;
}

const FORMAT = new Intl.NumberFormat("id-ID");

/** 1250000 -> "Rp1.250.000" */
export function rupiah(n) {
  return "Rp" + FORMAT.format(Number(n) || 0);
}

/** Versi pendek untuk kartu: "Rp1,25 miliar", "Rp350 juta". */
export function rupiahRingkas(n) {
  const v = Number(n) || 0;
  const pecah = (x) => FORMAT.format(Math.round(x * 100) / 100);
  if (Math.abs(v) >= 1e12) return `Rp${pecah(v / 1e12)} triliun`;
  if (Math.abs(v) >= 1e9) return `Rp${pecah(v / 1e9)} miliar`;
  if (Math.abs(v) >= 1e6) return `Rp${pecah(v / 1e6)} juta`;
  return rupiah(v);
}

/** Persentase satu desimal; 0 kalau anggaran 0. */
export function persen(realisasi, anggaran) {
  if (!anggaran) return 0;
  return Math.round(((Number(realisasi) || 0) / anggaran) * 1000) / 10;
}

/** Ubah isian "1.250.000" / "Rp 1,250,000" jadi angka bulat. */
export function parseRupiah(teks) {
  const digit = String(teks ?? "").replace(/[^\d]/g, "");
  return digit ? Number(digit) : 0;
}

const NOL = { anggaran: 0, realisasi: 0 };

/** Total anggaran & realisasi per jenis + selisih utama APBDes. */
export function hitungRingkasan(items) {
  const total = {};
  for (const j of JENIS_APBDES) total[j.nilai] = { ...NOL };
  for (const it of items || []) {
    const t = total[it.jenis];
    if (!t) continue;
    t.anggaran += Number(it.anggaran) || 0;
    t.realisasi += Number(it.realisasi) || 0;
  }
  return {
    ...total,
    // Surplus/defisit = pendapatan - belanja. Pembiayaan netto = penerimaan - pengeluaran.
    surplus: {
      anggaran: total.pendapatan.anggaran - total.belanja.anggaran,
      realisasi: total.pendapatan.realisasi - total.belanja.realisasi,
    },
    pembiayaanNetto: {
      anggaran: total.pembiayaan_penerimaan.anggaran - total.pembiayaan_pengeluaran.anggaran,
      realisasi: total.pembiayaan_penerimaan.realisasi - total.pembiayaan_pengeluaran.realisasi,
    },
  };
}

/** Kelompokkan rincian satu jenis berdasarkan `kelompok`, urutan kemunculan dijaga. */
export function kelompokkan(items) {
  const peta = new Map();
  for (const it of items) {
    const nama = it.kelompok?.trim() || "";
    if (!peta.has(nama)) peta.set(nama, { nama, items: [], anggaran: 0, realisasi: 0 });
    const g = peta.get(nama);
    g.items.push(it);
    g.anggaran += Number(it.anggaran) || 0;
    g.realisasi += Number(it.realisasi) || 0;
  }
  return [...peta.values()];
}

const KOLOM_ITEM = "id, tahun, jenis, kelompok, uraian, anggaran, realisasi, urutan, created_at";

function urutkanItem(a, b) {
  return a.urutan - b.urutan || new Date(a.created_at) - new Date(b.created_at);
}

/** Tahun yang sudah diterbitkan, terbaru dulu. */
export async function getTahunTerbit(supabase) {
  try {
    const { data } = await supabase
      .from("apbdes_tahun")
      .select("tahun")
      .eq("terbit", true)
      .order("tahun", { ascending: false });
    return (data || []).map((r) => r.tahun);
  } catch {
    return [];
  }
}

/** Satu tahun beserta rincian. RLS: publik hanya melihat yang terbit. */
export async function getApbdes(supabase, tahun) {
  try {
    const [{ data: meta }, { data: items }] = await Promise.all([
      supabase.from("apbdes_tahun").select("tahun, catatan, dokumen_url, terbit").eq("tahun", tahun).maybeSingle(),
      supabase.from("apbdes_item").select(KOLOM_ITEM).eq("tahun", tahun),
    ]);
    return { meta: meta ?? null, items: (items || []).sort(urutkanItem) };
  } catch {
    return { meta: null, items: [] };
  }
}

/** Ringkasan tahun terbit paling baru untuk beranda; null kalau belum ada. */
export async function getRingkasanApbdesTerbaru(supabase) {
  try {
    const [tahun] = await getTahunTerbit(supabase);
    if (!tahun) return null;
    const { data } = await supabase
      .from("apbdes_item")
      .select("jenis, anggaran, realisasi")
      .eq("tahun", tahun);
    if (!data || data.length === 0) return null;
    return { tahun, ringkasan: hitungRingkasan(data) };
  } catch {
    return null;
  }
}

/** Semua tahun beserta totalnya — panel admin. */
export async function getDaftarTahunAdmin(supabase) {
  try {
    const [{ data: tahun }, { data: items }] = await Promise.all([
      supabase.from("apbdes_tahun").select("tahun, terbit, dokumen_url").order("tahun", { ascending: false }),
      supabase.from("apbdes_item").select("tahun, jenis, anggaran, realisasi"),
    ]);
    return (tahun || []).map((t) => ({
      ...t,
      ringkasan: hitungRingkasan((items || []).filter((i) => i.tahun === t.tahun)),
    }));
  } catch {
    return [];
  }
}
