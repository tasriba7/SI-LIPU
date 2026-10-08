// Tanda tangan & stempel surat: disimpan di bucket PRIVAT "desa-ttd".
// Path-nya ada di config_desa; untuk ditampilkan dibuat signed URL (1 jam)
// di server, dan hanya untuk staf yang login (policy storage di migrasi 0022).

export const BUCKET_TTD = "desa-ttd";

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @returns {Promise<{ttdKades: string|null, ttdSekdes: string|null, stempel: string|null}>}
 */
export async function ambilBerkasTtd(supabase) {
  const kosong = { ttdKades: null, ttdSekdes: null, stempel: null };
  try {
    const { data, error } = await supabase
      .from("config_desa")
      .select("ttd_kades_path, ttd_sekdes_path, stempel_path")
      .eq("id", 1)
      .maybeSingle();
    if (error || !data) return kosong;

    const tandai = async (path) => {
      if (!path) return null;
      const { data: s } = await supabase.storage.from(BUCKET_TTD).createSignedUrl(path, 3600);
      return s?.signedUrl || null;
    };
    const [ttdKades, ttdSekdes, stempel] = await Promise.all([
      tandai(data.ttd_kades_path),
      tandai(data.ttd_sekdes_path),
      tandai(data.stempel_path),
    ]);
    return { ttdKades, ttdSekdes, stempel };
  } catch {
    return kosong;
  }
}

/** Pilih gambar sesuai snapshot surat (mode penandatangan + tombol centang). */
export function pilihGambar(berkas, isi) {
  const mode = isi?.penandatangan?.mode === "sekdes" ? "sekdes" : "kades";
  return {
    ttd: isi?.tampil_ttd ? (mode === "sekdes" ? berkas.ttdSekdes : berkas.ttdKades) : null,
    stempel: isi?.tampil_stempel ? berkas.stempel : null,
  };
}
