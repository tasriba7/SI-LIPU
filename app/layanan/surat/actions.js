"use server";

import { createClient } from "@/lib/supabase/server";
import { buatKodeTracking } from "@/lib/kodeTracking";

/**
 * Server Action untuk warga mengajukan surat lewat form publik, TANPA
 * login. Dipanggil dari <form action={formAction}> di app/layanan/surat/page.js.
 * Dijamin aman lewat RLS policy insert di supabase/migrations/0003_pengajuan_surat.sql
 * (warga cuma bisa insert baris baru, tidak bisa lihat/ubah data warga lain).
 */
export async function ajukanSurat(prevState, formData) {
  const jenis_surat = formData.get("jenis_surat")?.trim();
  const nama_pemohon = formData.get("nama_pemohon")?.trim();
  const nik = formData.get("nik")?.trim();
  const alamat = formData.get("alamat")?.trim();
  const no_hp = formData.get("no_hp")?.trim();
  const keperluan = formData.get("keperluan")?.trim();

  if (!jenis_surat || !nama_pemohon || !nik || !alamat || !no_hp || !keperluan) {
    return { error: "Semua kolom wajib diisi." };
  }

  if (!/^\d{16}$/.test(nik)) {
    return { error: "NIK harus berupa 16 digit angka." };
  }

  const supabase = await createClient();
  const kode_tracking = buatKodeTracking("SRT");

  const { error } = await supabase.from("pengajuan_surat").insert({
    kode_tracking,
    jenis_surat,
    nama_pemohon,
    nik,
    alamat,
    no_hp,
    keperluan,
  });

  if (error) {
    return {
      error: "Gagal mengirim pengajuan. Coba lagi sebentar, atau hubungi kantor desa.",
    };
  }

  return { success: true, kode_tracking };
}
