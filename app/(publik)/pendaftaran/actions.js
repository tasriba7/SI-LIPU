"use server";

import { createClient } from "@/lib/supabase/server";

export async function daftarPosisi(prevState, formData) {
  const posisi_id = formData.get("posisi_id");
  const nama_lengkap = formData.get("nama_lengkap")?.trim();
  const nik = formData.get("nik")?.trim();
  const no_hp = formData.get("no_hp")?.trim();
  const email = formData.get("email")?.trim();

  if (!posisi_id || !nama_lengkap || !nik || !no_hp || !email) {
    return { error: "Semua kolom wajib diisi." };
  }
  if (!/^\d{16}$/.test(nik)) {
    return { error: "NIK harus berupa 16 digit angka." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("pendaftaran_akun").insert({
    posisi_id,
    nama_lengkap,
    nik,
    no_hp,
    email,
  });

  if (error) {
    // Trigger cegah_daftar_slot_terisi() melempar pesan yang diawali
    // "SLOT_TERISI:" — deteksi itu supaya pesan ke warga jelas.
    if (error.message?.includes("SLOT_TERISI")) {
      return {
        error: "Slot untuk posisi & wilayah ini sudah terisi. Hubungi admin desa.",
      };
    }
    return { error: "Gagal mengirim pendaftaran. Coba lagi." };
  }

  return { success: true };
}
