"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const BATAS_GAGAL = 5;
const JENDELA_MENIT = 15;

/**
 * Riwayat pengajuan milik warga, lewat NIK + tanggal lahir (dua faktor).
 * Ikuti docs/SECURITY.md: rate limit di server, pesan generik, tanpa
 * membedakan "data salah" dan "belum ada pengajuan".
 */
export async function cariRiwayat(prevState, formData) {
  const nik = String(formData.get("nik") ?? "").trim();
  const tanggal = String(formData.get("tanggal_lahir") ?? "").trim();

  if (!nik || !tanggal) return { error: "NIK dan tanggal lahir wajib diisi." };
  if (!/^\d{16}$/.test(nik)) return { error: "NIK harus berupa 16 digit angka." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return { error: "Tanggal lahir tidak valid." };

  const h = await headers();
  const identifier = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const supabase = await createClient();

  const { data: jumlahGagal, error: errHitung } = await supabase.rpc("hitung_percobaan_gagal", {
    p_identifier: identifier,
    p_menit: JENDELA_MENIT,
  });
  if (!errHitung && jumlahGagal >= BATAS_GAGAL) {
    return { error: "Terlalu banyak percobaan. Coba lagi dalam beberapa menit." };
  }

  const { data, error } = await supabase.rpc("riwayat_pengajuan_publik", {
    p_nik: nik,
    p_tanggal_lahir: tanggal,
    p_identifier: identifier,
  });

  if (error) {
    return { error: "Riwayat belum bisa dimuat. Coba lagi nanti." };
  }
  if (!data || data.length === 0) {
    // Sama untuk "data tidak cocok" dan "belum pernah mengajukan".
    return {
      kosong: true,
      pesan:
        "Tidak ada riwayat ditemukan. Pastikan NIK dan tanggal lahir benar, atau Anda memang belum pernah mengajukan layanan dengan identitas tersebut.",
    };
  }
  return { riwayat: data };
}
