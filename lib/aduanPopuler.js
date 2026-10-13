import { createClient } from "@/lib/supabase/server";

// Data bagian "Aduan yang Sering Disampaikan" di beranda, lewat dua RPC:
//   - `aduan_populer`               (migrasi 0049): jenis + jumlah per jenis
//   - `ringkasan_penanganan_aduan`  (migrasi 0050): jumlah per status + rata-rata
//                                    lama penyelesaian
// Keduanya hanya agregat — aman dibaca publik, tanpa identitas atau isi
// pengaduan siapa pun.
//
// Mengembalikan null (bukan melempar error) bila migrasi belum dijalankan,
// Supabase belum siap, atau belum ada pengaduan: bagian ini cukup tidak
// tampil, beranda tetap normal. Bila hanya 0050 yang belum dijalankan,
// peringkat tetap tampil dan ringkasan penanganan disembunyikan.

function labelLama(jam) {
  if (jam === null || jam === undefined || Number.isNaN(jam)) return null;
  if (jam < 24) return "Kurang dari 1 hari";
  return `${Math.max(1, Math.round(jam / 24))} hari`;
}

function olahPenanganan(baris) {
  if (!baris) return null;
  const total = Number(baris.total) || 0;
  if (total === 0) return null;
  const selesai = Number(baris.selesai) || 0;
  const diproses = Number(baris.diproses) || 0;
  const menunggu = Number(baris.menunggu) || 0;
  return {
    total,
    selesai,
    diproses,
    menunggu,
    persenSelesai: Math.round((selesai / total) * 100),
    lamaRataRata: labelLama(
      baris.rata_rata_jam === null || baris.rata_rata_jam === undefined
        ? null
        : Number(baris.rata_rata_jam),
    ),
  };
}

export async function getAduanPopuler(batas = 5) {
  try {
    const supabase = await createClient();
    const [populer, ringkasan] = await Promise.all([
      supabase.rpc("aduan_populer", { p_batas: batas }),
      supabase.rpc("ringkasan_penanganan_aduan").single(),
    ]);

    const data = populer.data;
    if (populer.error || !Array.isArray(data) || data.length === 0) return null;

    const total = Number(data[0].total_pengaduan) || 0;
    const items = data.map((r) => ({
      jenis: r.jenis,
      jumlah: Number(r.jumlah) || 0,
    }));
    const tertinggi = Math.max(...items.map((i) => i.jumlah), 1);

    return {
      total,
      penanganan: ringkasan.error ? null : olahPenanganan(ringkasan.data),
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
