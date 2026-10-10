// Helper data Berita Desa. Dipakai beranda, /berita, /berita/[id], dan panel
// admin /dashboard/berita.

// Zona waktu tampilan tanggal. Ubah di sini kalau desa Anda WIB/WIT.
export const ZONA_WAKTU = "Asia/Makassar";

export const KATEGORI_BERITA = [
  { nilai: "pengumuman", label: "Pengumuman" },
  { nilai: "kegiatan", label: "Kegiatan Desa" },
  { nilai: "pemerintahan", label: "Pemerintahan" },
  { nilai: "pembangunan", label: "Pembangunan" },
  { nilai: "sosial", label: "Kesehatan & Sosial" },
  { nilai: "ekonomi", label: "Ekonomi & UMKM" },
  { nilai: "umum", label: "Umum" },
];

export function labelKategoriBerita(nilai) {
  return KATEGORI_BERITA.find((k) => k.nilai === nilai)?.label ?? "Umum";
}

export function tanggalIndo(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: ZONA_WAKTU,
  });
}

/** yyyy-mm-dd untuk <input type="date">, dalam zona waktu desa. */
export function tanggalInput(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("sv-SE", { timeZone: ZONA_WAKTU });
}

const KOLOM_LIST = "id, judul, ringkasan, kategori, foto_url, terbit, tanggal_terbit, created_at";
const KOLOM_DETAIL = `${KOLOM_LIST}, isi`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Berita terbit, terbaru dulu. Mengembalikan { items, total } (total = semua
 * yang cocok, untuk penomoran halaman).
 */
export async function getBeritaTerbit(supabase, { limit, kategori, halaman = 1, perHalaman } = {}) {
  try {
    let q = supabase
      .from("berita")
      .select(KOLOM_LIST, { count: "exact" })
      .eq("terbit", true)
      .order("tanggal_terbit", { ascending: false, nullsFirst: false });
    if (kategori) q = q.eq("kategori", kategori);
    if (perHalaman) {
      const dari = (Math.max(1, halaman) - 1) * perHalaman;
      q = q.range(dari, dari + perHalaman - 1);
    } else if (limit) {
      q = q.limit(limit);
    }
    const { data, count, error } = await q;
    if (error) return { items: [], total: 0 };
    return { items: data || [], total: count ?? (data || []).length };
  } catch {
    // Halaman publik harus tetap tampil walau tabel belum dimigrasi.
    return { items: [], total: 0 };
  }
}

/** Kategori yang punya berita terbit (untuk chip filter). */
export async function getKategoriBeritaAda(supabase) {
  try {
    const { data } = await supabase.from("berita").select("kategori").eq("terbit", true);
    const hitung = {};
    for (const r of data || []) hitung[r.kategori] = (hitung[r.kategori] || 0) + 1;
    return hitung;
  } catch {
    return {};
  }
}

export async function getBeritaById(supabase, id) {
  if (!id || !UUID.test(id)) return null;
  try {
    const { data } = await supabase.from("berita").select(KOLOM_DETAIL).eq("id", id).maybeSingle();
    return data ?? null;
  } catch {
    return null;
  }
}

export async function getBeritaLainnya(supabase, idSaatIni, jumlah = 3) {
  try {
    const { data } = await supabase
      .from("berita")
      .select(KOLOM_LIST)
      .eq("terbit", true)
      .neq("id", idSaatIni)
      .order("tanggal_terbit", { ascending: false, nullsFirst: false })
      .limit(jumlah);
    return data || [];
  } catch {
    return [];
  }
}

/** Semua berita termasuk draf — khusus panel admin (dibatasi RLS). */
export async function getBeritaAdmin(supabase) {
  try {
    const { data, error } = await supabase
      .from("berita")
      .select(KOLOM_LIST)
      .order("created_at", { ascending: false });
    return error ? [] : data || [];
  } catch {
    return [];
  }
}
