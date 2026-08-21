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
function buatPasswordAcak() {
  return crypto.randomUUID().slice(0, 12);
}

/**
 * Proses satu pendaftaran yang sudah dipastikan valid & pending: buat akun
 * Auth + kunci slot + update status. Dipakai baik oleh approve satuan
 * maupun approve massal supaya logikanya tidak dobel.
 */
async function prosesSatuPendaftaran(supabase, adminClient, adminId, pendaftaran, passwordBaru) {
  const posisi = pendaftaran.posisi_perangkat;

  const { data: userBaru, error: errBuatUser } = await adminClient.auth.admin.createUser({
    email: pendaftaran.email,
    password: passwordBaru,
    email_confirm: true,
    user_metadata: {
      nama: pendaftaran.nama_lengkap,
      role: posisi.role,
      jabatan: ROLE_LABELS[posisi.role],
      dusun: posisi.wilayah,
    },
  });

  if (errBuatUser) {
    return { error: `Gagal membuat akun: ${errBuatUser.message}` };
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
      diproses_oleh: adminId,
      tanggal_diproses: new Date().toISOString(),
    })
    .eq("id", pendaftaran.id);

  if (errPosisi || errPendaftaran) {
    return {
      error:
        "Akun berhasil dibuat, tapi gagal update status slot/pendaftaran. Cek manual di Supabase Dashboard.",
    };
  }

  return { success: true, email: pendaftaran.email, tempPassword: passwordBaru };
}

export async function setujuiPendaftaran(prevState, formData) {
  const pendaftaranId = formData.get("pendaftaran_id");
  const mode = formData.get("mode") || "acak"; // "manual" | "acak"
  const passwordManual = formData.get("password_manual")?.trim() || "";

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

  if (mode === "manual" && passwordManual.length < 6) {
    return { error: "Password manual minimal 6 karakter." };
  }

  const adminClient = createAdminClient();
  const passwordBaru = mode === "manual" ? passwordManual : buatPasswordAcak();

  const result = await prosesSatuPendaftaran(
    supabase,
    adminClient,
    admin?.id,
    pendaftaran,
    passwordBaru
  );

  if (result.error) return { error: result.error };

  revalidatePath("/dashboard/pendaftaran");
  revalidatePath("/dashboard/posisi");

  return result;
}

/**
 * Setujui SEMUA pendaftaran yang masih pending sekaligus. Semua dapat
 * password acak (tidak masuk akal minta admin isi manual satu-satu untuk
 * approve massal). Kegagalan satu pendaftaran tidak menghentikan yang lain.
 */
export async function setujuiSemuaPendaftaran() {
  const supabase = await createClient();
  const {
    data: { user: admin },
  } = await supabase.auth.getUser();

  const { data: daftarPending } = await supabase
    .from("pendaftaran_akun")
    .select("*, posisi_perangkat(id, role, wilayah, status)")
    .eq("status", "pending")
    .order("tanggal_daftar", { ascending: true });

  if (!daftarPending?.length) {
    return { error: "Tidak ada pendaftaran yang menunggu." };
  }

  const adminClient = createAdminClient();
  const hasil = [];

  for (const pendaftaran of daftarPending) {
    if (pendaftaran.posisi_perangkat?.status === "terisi") {
      hasil.push({
        nama: pendaftaran.nama_lengkap,
        error: "Slot sudah keburu terisi oleh pendaftar lain.",
      });
      continue;
    }
    const passwordBaru = buatPasswordAcak();
    const r = await prosesSatuPendaftaran(
      supabase,
      adminClient,
      admin?.id,
      pendaftaran,
      passwordBaru
    );
    hasil.push({
      nama: pendaftaran.nama_lengkap,
      email: r.email,
      tempPassword: r.tempPassword,
      error: r.error || null,
    });
  }

  revalidatePath("/dashboard/pendaftaran");
  revalidatePath("/dashboard/posisi");

  return { success: true, hasil };
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
