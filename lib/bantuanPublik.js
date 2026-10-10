import { createAdminClient } from "@/lib/supabase/admin";

export const UKURAN_HALAMAN_BANTUAN = 20;

/**
 * Program bantuan (jenis + periode) yang punya minimal satu penerima berstatus
 * "tampil". Dipanggil dari Server Component. Fungsi database
 * bantuan_publik_ringkasan hanya bisa dijalankan service_role (migrasi 0037).
 *
 * Gagal -> daftar kosong (halaman menampilkan "belum ada data"), bukan error
 * yang membocorkan detail ke warga.
 */
export async function ambilRingkasanBantuan() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("bantuan_publik_ringkasan");
    if (error) {
      console.error("bantuan_publik_ringkasan gagal:", error);
      return [];
    }
    return data ?? [];
  } catch (e) {
    console.error("ambilRingkasanBantuan gagal:", e);
    return [];
  }
}

/**
 * Daftar penerima satu program yang ditampilkan admin. Hanya nama + dusun/RT/RW
 * (NIK dan data lain tidak pernah dikembalikan oleh fungsi database).
 */
export async function ambilDaftarPenerimaBantuan({ jenisId, periode, cari, halaman }) {
  const hal = Math.max(1, Number.isFinite(halaman) ? Math.floor(halaman) : 1);
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("bantuan_publik_daftar", {
      p_jenis: jenisId,
      p_periode: periode ?? null,
      p_cari: cari || null,
      p_limit: UKURAN_HALAMAN_BANTUAN,
      p_offset: (hal - 1) * UKURAN_HALAMAN_BANTUAN,
    });
    if (error) {
      console.error("bantuan_publik_daftar gagal:", error);
      return { baris: [], total: 0, gagal: true };
    }
    const baris = data ?? [];
    return { baris, total: baris[0]?.total ? Number(baris[0].total) : 0, gagal: false };
  } catch (e) {
    console.error("ambilDaftarPenerimaBantuan gagal:", e);
    return { baris: [], total: 0, gagal: true };
  }
}
