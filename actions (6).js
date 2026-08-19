"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Server Action untuk warga cek status pengajuan surat pakai kode
 * tracking, TANPA login. Panggil RPC `cek_status_pengajuan_surat`
 * (security definer) supaya warga tidak bisa select tabel penuh —
 * cuma dapat data yang cocok dengan kode yang mereka masukkan.
 */
export async function cekStatusSurat(prevState, formData) {
  const kode = formData.get("kode_tracking")?.trim().toUpperCase();

  if (!kode) {
    return { error: "Masukkan kode tracking terlebih dahulu." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("cek_status_pengajuan_surat", { p_kode: kode })
    .maybeSingle();

  if (error || !data) {
    return { error: "Kode tracking tidak ditemukan. Periksa kembali penulisannya." };
  }

  return { result: data };
}
