import { createClient } from "@/lib/supabase/server";

// Angka pengunjung untuk footer beranda, lewat RPC `statistik_pengunjung`
// (migrasi 0044) — hanya dua angka agregat, aman dibaca publik.
//
// Mengembalikan null (bukan melempar error) bila migrasi belum dijalankan
// atau Supabase belum siap: footer cukup menyembunyikan penghitung, beranda
// tetap tampil normal.
export async function getPengunjung() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("statistik_pengunjung").single();
    if (error || !data) return null;
    return {
      total: Number(data.total_pengunjung) || 0,
      hariIni: Number(data.pengunjung_hari_ini) || 0,
    };
  } catch {
    return null;
  }
}
