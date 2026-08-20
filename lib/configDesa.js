// Helper untuk baca identitas desa (nama, wilayah administratif, alamat,
// foto latar beranda) dari tabel `config_desa`. Dipakai beranda publik &
// halaman admin "Pengaturan Desa" — JANGAN hardcode nama desa di kode,
// selalu lewat sini (lihat aturan #7 di docs/AI_HANDOFF.md).

export const DEFAULT_CONFIG_DESA = {
  id: 1,
  jenis_wilayah: "Desa",
  nama_desa: "",
  provinsi: "",
  kabupaten: "",
  kecamatan: "",
  alamat: "",
  foto_url: null,
};

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function getConfigDesa(supabase) {
  try {
    const { data, error } = await supabase
      .from("config_desa")
      .select("id, jenis_wilayah, nama_desa, provinsi, kabupaten, kecamatan, alamat, foto_url")
      .eq("id", 1)
      .maybeSingle();

    if (error || !data) {
      return DEFAULT_CONFIG_DESA;
    }

    return data;
  } catch {
    // Beranda publik harus tetap tampil normal walau Supabase belum diset.
    return DEFAULT_CONFIG_DESA;
  }
}

/** Label wilayah administratif lengkap, mis. "Kec. X, Kab. Y, Prov. Z". */
export function labelWilayah(config) {
  const bagian = [
    config?.kecamatan ? `Kec. ${config.kecamatan}` : null,
    config?.kabupaten ? `Kab. ${config.kabupaten}` : null,
    config?.provinsi ? `Prov. ${config.provinsi}` : null,
  ].filter(Boolean);
  return bagian.join(", ");
}
