// Helper untuk baca data galeri kegiatan dari tabel `galeri_kegiatan`.
// Dipakai beranda publik, halaman /galeri, dan panel admin
// /dashboard/galeri — jangan query tabel ini langsung di banyak tempat,
// supaya kolom yang diambil konsisten kalau skema berubah nanti.

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{ limit?: number }} [opsi]
 */
export async function getGaleri(supabase, opsi = {}) {
  try {
    let query = supabase
      .from("galeri_kegiatan")
      .select("id, judul, deskripsi, foto_url, created_at")
      .order("created_at", { ascending: false });

    if (opsi.limit) {
      query = query.limit(opsi.limit);
    }

    const { data, error } = await query;

    if (error) return [];
    return data || [];
  } catch {
    // Beranda publik harus tetap tampil normal walau Supabase belum diset.
    return [];
  }
}

/**
 * Jumlah total foto galeri — dipakai beranda untuk memutuskan apakah perlu
 * menampilkan tautan "Lihat semua galeri" (kalau totalnya lebih banyak
 * daripada yang ditampilkan di beranda).
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function getGaleriCount(supabase) {
  try {
    const { count, error } = await supabase
      .from("galeri_kegiatan")
      .select("id", { count: "exact", head: true });

    if (error) return 0;
    return count || 0;
  } catch {
    return 0;
  }
}
