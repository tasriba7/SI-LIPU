// Konten profil desa lengkap (sejarah, visi, misi, batas & luas wilayah).
// Sengaja DIPISAH dari getConfigDesa (lib/configDesa.js): getConfigDesa dipakai
// header & beranda di setiap halaman, jadi tidak boleh ikut gagal kalau
// migrasi 0035 belum dijalankan. Fungsi ini hanya dipakai /profil dan form
// admin profil, dan aman gagal (mengembalikan nilai kosong).

export const BATAS_PROFIL = {
  sejarah: 8000,
  visi: 1000,
  misi: 4000,
  batas: 200,
  luas: 100,
};

export const PROFIL_KOSONG = {
  profil_sejarah: "",
  profil_visi: "",
  profil_misi: "",
  batas_utara: "",
  batas_selatan: "",
  batas_timur: "",
  batas_barat: "",
  luas_wilayah: "",
};

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @returns {Promise<{ profil: typeof PROFIL_KOSONG, siap: boolean }>}
 *   siap=false berarti kolom belum ada (migrasi 0035 belum dijalankan).
 */
export async function getProfilDesa(supabase) {
  try {
    const { data, error } = await supabase
      .from("config_desa")
      .select(Object.keys(PROFIL_KOSONG).join(", "))
      .eq("id", 1)
      .maybeSingle();

    if (error) return { profil: PROFIL_KOSONG, siap: false };
    return { profil: { ...PROFIL_KOSONG, ...(data ?? {}) }, siap: true };
  } catch {
    return { profil: PROFIL_KOSONG, siap: false };
  }
}

/** Pecah teks misi (satu poin per baris) jadi daftar, buang nomor/tanda "-". */
export function pecahMisi(teks) {
  return String(teks ?? "")
    .split(/\r?\n/)
    .map((baris) => baris.replace(/^\s*(?:\d+[.)]|[-•*])\s*/, "").trim())
    .filter(Boolean);
}
