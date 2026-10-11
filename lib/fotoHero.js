// Foto latar beranda (hero) yang berganti otomatis — dikelola admin di
// /dashboard/pengaturan-desa/foto-beranda. Tabel: foto_hero_beranda (migrasi 0048).

export const MAKS_FOTO_HERO = 10;

/** Daftar foto hero berurutan: [{ id, gambar_url, urutan }]. Kosong kalau belum ada / belum dimigrasi. */
export async function getFotoHero(supabase) {
  try {
    const { data, error } = await supabase
      .from("foto_hero_beranda")
      .select("id, gambar_url, urutan")
      .order("urutan", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) return [];
    return data ?? [];
  } catch {
    // Beranda publik harus tetap tampil walau tabel belum dimigrasi.
    return [];
  }
}
