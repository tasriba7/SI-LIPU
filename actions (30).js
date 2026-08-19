"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROLE_LABELS } from "@/lib/roles";

/**
 * Setujui pendaftaran Kadus/Ketua RT: buat akun Supabase Auth (lewat
 * Secret Key, HANYA server-side), lalu kunci slot posisi ke akun baru itu.
 * Trigger handle_new_user (migration 0001/0002) otomatis membuat baris di
 * `profiles` begitu user Auth dibuat.
 */
export async function setujuiPendaftaran(prevState, formData) {
  const pendaftaranId = formData.get("pendaftaran_id");

  const supabase = await createClient();
  const {
    data: { user: admin },
  } = await supabase.auth.getUser();

  const { data: pendaftaran } = await supabase
    .from("pendaftaran_akun")
    .select("*, posisi_perangkat(id, role, wilayah, status)")
    .eq("id", pendaftaranId)
    .single();

  if (!pendaftaran) {
    return { error: "Data pendaftaran tidak ditemukan." };
  }
  if (pendaftaran.status !== "pending") {
    return { error: "Pendaftaran ini sudah diproses sebelumnya." };
  }
  // Cek ulang (race condition): slot mungkin sudah terisi oleh pendaftar lain.
  if (pendaftaran.posisi_perangkat?.status === "terisi") {
    return { error: "Slot ini sudah keburu terisi oleh pendaftar lain." };
  }

  const posisi = pendaftaran.posisi_perangkat;
  const adminClient = createAdminClient();

  const tempPassword = crypto.randomUUID().slice(0, 12);

  const { data: userBaru, error: errBuatUser } = await adminClient.auth.admin.createUser({
    email: pendaftaran.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      nama: pendaftaran.nama_lengkap,
      role: posisi.role,
      jabatan: ROLE_LABELS[posisi.role],
      dusun: posisi.wilayah,
    },
  });

  if (errBuatUser) {
    return {
      error: `Gagal membuat akun: ${errBuatUser.message}. (Kalau email sudah terdaftar, cek dulu di Supabase Dashboard.)`,
    };
  }

  const { error: errPosisi } = await supabase
    .from("posisi_perangkat")
    .update({
      status: "terisi",
      profile_id: userBaru.user.id,
      diisi_pada: new Date().toISOString(),
    })
    .eq("id", posisi.id);

  const { error: errPendaftaran } = await supabase
    .from("pendaftaran_akun")
    .update({
      status: "disetujui",
      diproses_oleh: admin?.id,
      tanggal_diproses: new Date().toISOString(),
    })
    .eq("id", pendaftaranId);

  if (errPosisi || errPendaftaran) {
    return {
      error:
        "Akun berhasil dibuat, tapi gagal update status slot/pendaftaran. Cek manual di Supabase Dashboard.",
    };
  }

  revalidatePath("/dashboard/pendaftaran");
  revalidatePath("/dashboard/posisi");

  return {
    success: true,
    email: pendaftaran.email,
    tempPassword,
  };
}

export async function tolakPendaftaran(prevState, formData) {
  const pendaftaranId = formData.get("pendaftaran_id");
  const catatan_admin = formData.get("catatan_admin")?.trim() || null;

  const supabase = await createClient();
  const {
    data: { user: admin },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("pendaftaran_akun")
    .update({
      status: "ditolak",
      catatan_admin,
      diproses_oleh: admin?.id,
      tanggal_diproses: new Date().toISOString(),
    })
    .eq("id", pendaftaranId);

  if (error) {
    return { error: "Gagal menolak pendaftaran." };
  }

  revalidatePath("/dashboard/pendaftaran");
  return { success: true };
}
