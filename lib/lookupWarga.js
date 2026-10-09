import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

const BATAS_PERCOBAAN_GAGAL = 5;
const JENDELA_MENIT = 15;

/**
 * Identifier pemohon (IP) untuk rate limiting.
 * Urutan: header yang diisi platform hosting (tidak bisa dipalsukan klien di
 * Vercel) -> x-real-ip -> entri pertama x-forwarded-for.
 * CATATAN: kalau di-host di luar Vercel/proxy tepercaya, pastikan proxy Anda
 * menimpa header-header ini, kalau tidak klien bisa memalsukannya.
 */
export async function ambilIdentifier() {
  const h = await headers();
  const ip =
    h.get("x-vercel-forwarded-for") ||
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",")[0];
  return (ip || "").trim().slice(0, 64) || "unknown";
}

/**
 * Cari data warga lewat kombinasi NIK + Tanggal Lahir (dua faktor), sesuai
 * docs/SECURITY.md. WAJIB dipanggil dari Server Action.
 *
 * Fungsi database `cari_warga_publik` & `hitung_percobaan_gagal` hanya bisa
 * dijalankan service_role (migrasi 0029), jadi rate limit di sini TIDAK bisa
 * dilewati dengan memanggil API Supabase langsung dari luar.
 *
 * Return:
 *  - { rateLimited: true } kalau melewati batas ATAU pengecekan batas gagal
 *    (gagal-tertutup: lebih baik menolak daripada membuka tanpa batas)
 *  - { found: false } kalau NIK+Tanggal Lahir tidak cocok (pesan generik)
 *  - { found: true, data: { warga_id, nama_lengkap, dusun, rt, rw } }
 *    (no_hp sengaja dibuang di sini: SECURITY.md poin 6 hanya mengizinkan
 *    nama + dusun/RT/RW untuk isi otomatis)
 */
export async function cariWargaDenganRateLimit(nik, tanggalLahir) {
  const identifier = await ambilIdentifier();
  const supabase = createAdminClient();

  const { data: jumlahGagal, error: errHitung } = await supabase.rpc(
    "hitung_percobaan_gagal",
    { p_identifier: identifier, p_menit: JENDELA_MENIT }
  );

  if (errHitung || jumlahGagal >= BATAS_PERCOBAAN_GAGAL) {
    return { rateLimited: true };
  }

  const { data, error } = await supabase
    .rpc("cari_warga_publik", {
      p_nik: nik,
      p_tanggal_lahir: tanggalLahir,
      p_identifier: identifier,
    })
    .maybeSingle();

  if (error || !data) {
    return { found: false };
  }

  const { warga_id, nama_lengkap, dusun, rt, rw } = data;
  return { found: true, data: { warga_id, nama_lengkap, dusun, rt, rw } };
}
