// Helper data Wisata Desa. Dipakai beranda, /wisata, /wisata/[id], dan panel
// admin /dashboard/wisata — jangan query tabel `wisata` langsung di banyak
// tempat supaya kolom yang diambil konsisten.

export const KATEGORI_WISATA = [
  { nilai: "alam", label: "Wisata Alam" },
  { nilai: "bahari", label: "Pantai & Bahari" },
  { nilai: "budaya", label: "Budaya & Sejarah" },
  { nilai: "religi", label: "Religi" },
  { nilai: "kuliner", label: "Kuliner" },
  { nilai: "agro", label: "Agrowisata" },
  { nilai: "lainnya", label: "Lainnya" },
];

export function labelKategori(nilai) {
  return KATEGORI_WISATA.find((k) => k.nilai === nilai)?.label ?? "Lainnya";
}

const KOLOM =
  "id, nama, kategori, deskripsi, lokasi, jam_buka, tiket, kontak, maps_url, foto_url, unggulan, aktif, created_at";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Daftar wisata untuk publik (hanya yang aktif), unggulan lebih dulu.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{ limit?: number }} [opsi]
 */
export async function getWisata(supabase, opsi = {}) {
  try {
    let q = supabase
      .from("wisata")
      .select(KOLOM)
      .eq("aktif", true)
      .order("unggulan", { ascending: false })
      .order("created_at", { ascending: false });
    if (opsi.limit) q = q.limit(opsi.limit);
    const { data, error } = await q;
    return error ? [] : data || [];
  } catch {
    // Halaman publik harus tetap tampil walau tabel belum dimigrasi.
    return [];
  }
}

export async function getWisataCount(supabase) {
  try {
    const { count, error } = await supabase
      .from("wisata")
      .select("id", { count: "exact", head: true })
      .eq("aktif", true);
    return error ? 0 : count || 0;
  } catch {
    return 0;
  }
}

/** Semua wisata termasuk yang nonaktif — khusus panel admin (dibatasi RLS). */
export async function getWisataAdmin(supabase) {
  try {
    const { data, error } = await supabase
      .from("wisata")
      .select(KOLOM)
      .order("created_at", { ascending: false });
    return error ? [] : data || [];
  } catch {
    return [];
  }
}

/**
 * Satu wisata. Publik hanya dapat yang aktif (RLS); admin dapat semuanya.
 * @returns {Promise<object|null>}
 */
export async function getWisataById(supabase, id) {
  if (!id || !UUID.test(id)) return null;
  try {
    const { data } = await supabase.from("wisata").select(KOLOM).eq("id", id).maybeSingle();
    return data ?? null;
  } catch {
    return null;
  }
}
