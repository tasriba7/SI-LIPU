// Daftar menu publik yang punya banner gambar + helper bacanya.
// Mau menambah menu baru? Cukup tambah satu baris di HALAMAN_BANNER, lalu
// pasang <BannerHalaman kunci="..." /> di halamannya — tanpa migrasi baru.

export const HALAMAN_BANNER = [
  { kunci: "layanan", nama: "Panel Warga", href: "/layanan" },
  { kunci: "wisata", nama: "Wisata Desa", href: "/wisata" },
  { kunci: "galeri", nama: "Galeri Kegiatan", href: "/galeri" },
  { kunci: "pendaftaran", nama: "Pendaftaran Kadus/RT", href: "/pendaftaran" },
  { kunci: "profil", nama: "Profil Desa", href: "/profil" },
];

export function cariHalamanBanner(kunci) {
  return HALAMAN_BANNER.find((h) => h.kunci === kunci) ?? null;
}

/** Peta { kunci: gambar_url } untuk semua menu. */
export async function getSemuaBanner(supabase) {
  try {
    const { data } = await supabase.from("banner_halaman").select("halaman, gambar_url");
    return Object.fromEntries((data ?? []).map((r) => [r.halaman, r.gambar_url]));
  } catch {
    return {};
  }
}

/** URL gambar banner satu menu, atau null kalau belum diunggah. */
export async function getBannerHalaman(supabase, kunci) {
  try {
    const { data } = await supabase
      .from("banner_halaman")
      .select("gambar_url")
      .eq("halaman", kunci)
      .maybeSingle();
    return data?.gambar_url ?? null;
  } catch {
    // Halaman publik harus tetap tampil walau tabel belum dimigrasi.
    return null;
  }
}
