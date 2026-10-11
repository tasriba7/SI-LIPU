// Helper data Struktur Organisasi. Dipakai beranda, /struktur-organisasi, dan
// panel admin /dashboard/struktur-organisasi — jangan query tabel
// `struktur_organisasi` langsung di banyak tempat supaya kolom konsisten.

const KOLOM = "id, nama, jabatan, foto_url, atasan_id, urutan, aktif, created_at";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function urutkan(a, b) {
  return (a.urutan ?? 0) - (b.urutan ?? 0) || String(a.created_at).localeCompare(String(b.created_at));
}

/**
 * Ubah daftar datar menjadi pohon: [{ ...node, anak: [...] }].
 * Node yang atasannya tidak ada di daftar (mis. atasan disembunyikan) ikut
 * tidak tampil, supaya bagan publik tidak "melompat" ke tingkat yang salah.
 */
export function bangunPohon(daftar) {
  const peta = new Map(daftar.map((n) => [n.id, { ...n, anak: [] }]));
  const akar = [];
  for (const node of peta.values()) {
    if (!node.atasan_id) akar.push(node);
    else peta.get(node.atasan_id)?.anak.push(node);
  }
  const rapikan = (list) => {
    list.sort(urutkan);
    list.forEach((n) => rapikan(n.anak));
    return list;
  };
  return rapikan(akar);
}

/** Jumlah node di seluruh pohon. */
export function hitungNode(pohon) {
  return pohon.reduce((t, n) => t + 1 + hitungNode(n.anak), 0);
}

/** Pohon untuk publik (hanya yang aktif). Kosong bila tabel belum dimigrasi. */
export async function getStrukturPublik(supabase) {
  try {
    const { data, error } = await supabase
      .from("struktur_organisasi")
      .select(KOLOM)
      .eq("aktif", true);
    return error ? [] : bangunPohon(data || []);
  } catch {
    // Halaman publik harus tetap tampil walau tabel belum dimigrasi.
    return [];
  }
}

/** Daftar datar semua node termasuk yang disembunyikan — khusus panel admin. */
export async function getStrukturAdmin(supabase) {
  try {
    const { data, error } = await supabase.from("struktur_organisasi").select(KOLOM);
    return error ? [] : data || [];
  } catch {
    return [];
  }
}

export async function getStrukturById(supabase, id) {
  if (!id || !UUID.test(id)) return null;
  try {
    const { data } = await supabase
      .from("struktur_organisasi")
      .select(KOLOM)
      .eq("id", id)
      .maybeSingle();
    return data ?? null;
  } catch {
    return null;
  }
}

/** Id node itu sendiri + semua keturunannya (untuk mencegah atasan melingkar). */
export function idKeturunan(daftar, id) {
  const hasil = new Set([id]);
  let bertambah = true;
  while (bertambah) {
    bertambah = false;
    for (const n of daftar) {
      if (n.atasan_id && hasil.has(n.atasan_id) && !hasil.has(n.id)) {
        hasil.add(n.id);
        bertambah = true;
      }
    }
  }
  return hasil;
}

/** Inisial untuk pengganti foto: dua huruf pertama dari kata awal nama. */
export function inisialNama(nama) {
  const kata = (nama || "").replace(/^(H\.|Hj\.|Drs\.|Dra\.|Ir\.)\s*/i, "").trim().split(/\s+/);
  return ((kata[0]?.[0] || "") + (kata[1]?.[0] || "")).toUpperCase() || "?";
}
