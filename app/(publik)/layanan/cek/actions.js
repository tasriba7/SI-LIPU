"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Cek status pengajuan — coba tabel generik `pengajuan_layanan` dulu
 * (sistem baru, Form Builder), fallback ke `pengajuan_surat` lama (data
 * sebelum migrasi 0005) supaya kode tracking lama tetap bisa dicek.
 */
export async function cekStatusLayanan(prevState, formData) {
  const kode = formData.get("kode_tracking")?.trim().toUpperCase();

  if (!kode) {
    return { error: "Masukkan kode tracking terlebih dahulu." };
  }

  const supabase = await createClient();

  const { data: dataBaru } = await supabase
    .rpc("cek_status_pengajuan_layanan", { p_kode: kode })
    .maybeSingle();

  if (dataBaru) {
    return { result: { ...dataBaru, jenis_surat: dataBaru.nama_layanan } };
  }

  const { data: dataLama } = await supabase
    .rpc("cek_status_pengajuan_surat", { p_kode: kode })
    .maybeSingle();

  if (dataLama) {
    return { result: dataLama };
  }

  return { error: "Kode tracking tidak ditemukan. Periksa kembali penulisannya." };
}
