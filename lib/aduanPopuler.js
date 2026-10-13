import { createClient } from "@/lib/supabase/server";

// Aduan yang paling sering disampaikan warga, untuk beranda, lewat RPC
// `aduan_populer` (migrasi 0049) — hanya jenis + jumlah (agregat), aman dibaca
// publik dan tidak memuat identitas atau isi pengaduan siapa pun.
//
// Mengembalikan null (bukan melempar error) bila migrasi belum dijalankan,
// Supabase belum siap, atau belum ada pengaduan: bagian ini cukup tidak
// tampil, beranda tetap normal.
export async function getAduanPopuler(batas = 5) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("aduan_populer", { p_batas: batas });
    if (error || !Array.isArray(data) || data.length === 0) return null;

    const total = Number(data[0].total_pengaduan) || 0;
    const items = data.map((r) => ({
      jenis: r.jenis,
      jumlah: Number(r.jumlah) || 0,
    }));
    const tertinggi = Math.max(...items.map((i) => i.jumlah), 1);

    return {
      total,
      items: items.map((i) => ({
        ...i,
        persen: total > 0 ? Math.round((i.jumlah / total) * 100) : 0,
        lebar: Math.max(6, Math.round((i.jumlah / tertinggi) * 100)),
      })),
    };
  } catch {
    return null;
  }
}
