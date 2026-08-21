"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminRole } from "@/lib/roles";

function buatPasswordAcak() {
  return crypto.randomUUID().slice(0, 12);
}

/**
 * Fitur ini paling sensitif (bisa reset password akun ORANG LAIN), jadi
 * WAJIB dicek ulang di server setiap kali dipanggil — jangan andalkan
 * UI/sidebar yang menyembunyikan menu saja, karena server action bisa
 * dipanggil langsung tanpa lewat halaman.
 */
async function pastikanAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Anda harus login." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!isAdminRole(profile?.role)) {
    return { error: "Anda tidak punya akses untuk mengatur password akun staf lain." };
  }

  return { ok: true };
}

/**
 * Atur ulang password akun staf yang SUDAH aktif (bukan proses pendaftaran
 * baru). Dipakai di /dashboard/kelola-akun. Admin bisa isi password manual
 * sendiri, atau biarkan sistem generate password acak.
 */
export async function aturPasswordAkun(prevState, formData) {
  const cekAdmin = await pastikanAdmin();
  if (cekAdmin.error) return { error: cekAdmin.error };

  const userId = formData.get("user_id");
  const mode = formData.get("mode"); // "manual" | "acak"
  const passwordManual = formData.get("password_manual")?.trim() || "";

  if (!userId) {
    return { error: "Akun tidak ditemukan." };
  }

  let passwordBaru;
  if (mode === "manual") {
    if (passwordManual.length < 6) {
      return { error: "Password manual minimal 6 karakter." };
    }
    passwordBaru = passwordManual;
  } else {
    passwordBaru = buatPasswordAcak();
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    password: passwordBaru,
  });

  if (error) {
    return { error: `Gagal mengatur password: ${error.message}` };
  }

  revalidatePath("/dashboard/kelola-akun");

  return { success: true, password: passwordBaru };
}

/**
 * Atur ulang password untuk BANYAK akun sekaligus (dicentang admin di
 * halaman Kelola Akun). Semua dapat password acak (tidak masuk akal minta
 * password manual sama untuk banyak orang sekaligus).
 */
export async function aturPasswordMassal(prevState, formData) {
  const cekAdmin = await pastikanAdmin();
  if (cekAdmin.error) return { error: cekAdmin.error };

  const userIds = formData.getAll("user_id");

  if (!userIds.length) {
    return { error: "Tidak ada akun yang dipilih." };
  }

  const adminClient = createAdminClient();
  const hasil = [];

  for (const userId of userIds) {
    const passwordBaru = buatPasswordAcak();
    const { error } = await adminClient.auth.admin.updateUserById(userId, {
      password: passwordBaru,
    });
    hasil.push({
      userId,
      password: error ? null : passwordBaru,
      error: error?.message || null,
    });
  }

  revalidatePath("/dashboard/kelola-akun");

  return { success: true, hasil };
}
