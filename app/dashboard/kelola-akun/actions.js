"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pastikanAdmin as pastikanAdminBersama } from "@/lib/akses";
import { ROLE_BISA_DIBUAT_ADMIN, ROLE_LABELS } from "@/lib/roles";

function buatPasswordAcak() {
  return crypto.randomUUID().slice(0, 12);
}

async function pastikanAdmin() {
  const supabase = await createClient();
  return await pastikanAdminBersama(supabase);
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

/**
 * Admin membuat akun staf langsung (tanpa lewat pendaftaran mandiri).
 * Dipakai terutama untuk akun Kepala Desa, Sekdes, Kaur, Kasi, atau admin lain.
 * Kadus & Ketua RT tetap lewat slot + pendaftaran supaya tercatat per wilayah.
 */
export async function buatAkunStaf(prevState, formData) {
  const cek = await pastikanAdmin();
  if (cek.error) return { error: cek.error };

  const nama = formData.get("nama")?.toString().trim();
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const role = formData.get("role")?.toString();
  const jabatanInput = formData.get("jabatan")?.toString().trim();
  const mode = formData.get("mode"); // "manual" | "acak"
  const passwordManual = formData.get("password_manual")?.toString().trim() || "";

  if (!nama || !email || !role) {
    return { error: "Nama, email, dan role wajib diisi." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Format email tidak valid." };
  }
  if (!ROLE_BISA_DIBUAT_ADMIN.includes(role)) {
    return {
      error:
        "Role ini tidak dibuat dari sini. Kadus & Ketua RT dibuat lewat Slot Posisi + Pendaftaran Akun.",
    };
  }
  if (mode === "manual" && passwordManual.length < 6) {
    return { error: "Password manual minimal 6 karakter." };
  }

  const passwordBaru = mode === "manual" ? passwordManual : buatPasswordAcak();

  const adminClient = createAdminClient();
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: passwordBaru,
    email_confirm: true,
    user_metadata: {
      nama,
      role,
      jabatan: jabatanInput || ROLE_LABELS[role],
    },
  });

  if (error) {
    return { error: `Gagal membuat akun: ${error.message}` };
  }

  revalidatePath("/dashboard/kelola-akun");
  return { success: true, email, password: passwordBaru, userId: data.user.id };
}
