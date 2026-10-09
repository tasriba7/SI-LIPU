"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { adalahEmail, adalahNoHp, adalahUuid, ambilTeks } from "@/lib/validasiPengajuan";

/**
 * Pendaftaran calon Kadus/Ketua RT/Kepala Desa lewat slot posisi.
 * Insert memakai client service-role karena tabel tidak lagi menerima insert
 * langsung dari publik (migrasi 0029). Trigger cegah_daftar_slot_terisi()
 * tetap berjalan di database.
 */
export async function daftarPosisi(prevState, formData) {
  const posisi_id = String(formData.get("posisi_id") ?? "");
  const nama_lengkap = ambilTeks(formData, "nama_lengkap", 120);
  const nik = ambilTeks(formData, "nik", 16);
  const no_hp = ambilTeks(formData, "no_hp", 20);
  const email = ambilTeks(formData, "email", 254).toLowerCase();

  if (!posisi_id || !nama_lengkap || !nik || !no_hp || !email) {
    return { error: "Semua kolom wajib diisi." };
  }
  if (!adalahUuid(posisi_id)) {
    return { error: "Posisi tidak valid." };
  }
  if (!/^\d{16}$/.test(nik)) {
    return { error: "NIK harus berupa 16 digit angka." };
  }
  if (!adalahNoHp(no_hp)) {
    return { error: "Nomor HP tidak valid. Gunakan angka, spasi, tanda + atau -." };
  }
  if (!adalahEmail(email)) {
    return { error: "Format email tidak valid." };
  }

  const supabase = createAdminClient();

  // Cegah antrian admin dibanjiri: satu NIK hanya boleh punya satu pendaftaran
  // berstatus menunggu untuk posisi yang sama.
  const { count } = await supabase
    .from("pendaftaran_akun")
    .select("id", { count: "exact", head: true })
    .eq("posisi_id", posisi_id)
    .eq("nik", nik)
    .eq("status", "pending");
  if (count > 0) {
    return { error: "Pendaftaran Anda untuk posisi ini sudah masuk dan sedang menunggu persetujuan admin." };
  }

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
