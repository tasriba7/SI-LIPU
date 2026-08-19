import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const BATAS_PERCOBAAN_GAGAL = 5;
const JENDELA_MENIT = 15;

/**
 * Ambil identifier pemohon (IP) dari header request, untuk rate limiting.
 * Di Vercel, IP asli klien ada di header x-forwarded-for.
 */
async function ambilIdentifier() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

/**
 * Cari data warga lewat kombinasi NIK + Tanggal Lahir (dua faktor), sesuai
 * docs/SECURITY.md. WAJIB dipanggil dari Server Action, BUKAN langsung dari
 * Client Component, supaya identifier (IP) dan rate limiting bisa dicek
 * dengan benar.
 *
 * Return:
 *  - { rateLimited: true } kalau sudah melewati batas percobaan gagal
 *  - { found: false } kalau NIK+Tanggal Lahir tidak cocok (pesan digeneralisasi,
 *    JANGAN pernah bilang field mana yang salah)
 *  - { found: true, data: { warga_id, nama_lengkap, dusun, rt, rw } } kalau cocok
 */
export async function cariWargaDenganRateLimit(nik, tanggalLahir) {
  const identifier = await ambilIdentifier();
  const supabase = await createClient();

  const { data: jumlahGagal, error: errHitung } = await supabase.rpc(
    "hitung_percobaan_gagal",
    { p_identifier: identifier, p_menit: JENDELA_MENIT }
  );

  if (!errHitung && jumlahGagal >= BATAS_PERCOBAAN_GAGAL) {
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

  return { found: true, data };
}
