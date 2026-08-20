import { createClient } from "@/lib/supabase/server";

// Ambil 3 angka agregat untuk kartu statistik di beranda publik, lewat RPC
// `statistik_beranda` (lihat migration 0008) — aman dipanggil tanpa login
// karena hanya mengembalikan count, bukan data individu warga.
//
// Selalu balikan angka (fallback 0), jangan pernah throw ke halaman —
// beranda publik harus tetap tampil normal walau Supabase belum diset
// (mis. saat development lokal tanpa env var terisi).
export async function getStatistikBeranda() {
  const DEFAULT = {
    totalPenduduk: 0,
    totalKepalaKeluarga: 0,
    totalAjuanDiproses: 0,
  };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("statistik_beranda").single();

    if (error || !data) {
      return DEFAULT;
    }

    return {
      totalPenduduk: Number(data.total_penduduk) || 0,
      totalKepalaKeluarga: Number(data.total_kepala_keluarga) || 0,
      totalAjuanDiproses: Number(data.total_ajuan_diproses) || 0,
    };
  } catch {
    return DEFAULT;
  }
}
