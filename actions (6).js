"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { cekTautan, ambilDataTautan, tokenValid, hashToken } from "@/lib/tautanData";

/**
 * Membuka tautan = tombol "buka data" ditekan di halaman peringatan.
 * Urutan sengaja begini:
 *   1. cek tautan masih aktif (belum menghanguskan apa pun)
 *   2. ambil datanya. Kalau gagal, tautan BELUM terpakai dan bisa dicoba lagi
 *   3. hanguskan secara ATOMIK (satu perintah UPDATE bersyarat). Kalau dua
 *      orang menekan bersamaan, hanya satu yang berhasil.
 *   4. baru kirim data ke penerima
 */
export async function bukaTautanData(token) {
  if (!tokenValid(token)) return { status: "tidak_ditemukan" };

  const admin = createAdminClient();
  const { status, baris, desa } = await cekTautan(admin, token);
  if (status !== "aktif") return { status, desa };

  let data;
  try {
    data = await ambilDataTautan(admin, baris.seksi);
  } catch {
    return { status: "gagal" };
  }

  const sekarang = new Date().toISOString();
  const { data: dikunci, error } = await admin
    .from("tautan_data")
    .update({ status: "dibuka", dibuka_pada: sekarang })
    .eq("token_hash", hashToken(token))
    .eq("status", "aktif")
    .gt("kedaluwarsa_pada", sekarang)
    .select("id");

  if (error) return { status: "gagal" };
  if (!dikunci?.length) return { status: "dibuka", desa };

  return {
    status: "ok",
    instansi: baris.instansi,
    seksi: baris.seksi,
    data,
    desa,
  };
}
