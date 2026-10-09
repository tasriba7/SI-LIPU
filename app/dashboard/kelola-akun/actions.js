"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pastikanAdmin as pastikanAdminBersama } from "@/lib/akses";
import { ROLE_BISA_DIBUAT_ADMIN, ROLE_LABELS } from "@/lib/roles";
import { buatPasswordAcak, PASSWORD_MINIMAL } from "@/lib/passwordAcak";
import { adalahUuid } from "@/lib/validasiPengajuan";

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
    if (passwordManual.length < PASSWORD_MINIMAL) {
      return { error: `Password manual minimal ${PASSWORD_MINIMAL} karakter.` };
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
  if (mode === "manual" && passwordManual.length < PASSWORD_MINIMAL) {
    return { error: `Password manual minimal ${PASSWORD_MINIMAL} karakter.` };
  }

  const passwordBaru = mode === "manual" ? passwordManual : buatPasswordAcak();

  const adminClient = createAdminClient();
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: passwordBaru,
    email_confirm: true,
    // Role & jabatan lewat app_metadata (hanya bisa ditulis server). JANGAN
    // taruh role di user_metadata: user_metadata bisa diisi sendiri oleh
    // pendaftar (lihat migrasi 0029, trigger handle_new_user).
    user_metadata: { nama },
    app_metadata: {
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

/**
 * Hapus akun Kepala Dusun / Ketua RT (hanya admin).
 *
 * Pengamanan:
 *  - Hanya role kadus & ketua_rt; akun sendiri dan role lain ditolak.
 *  - Data penduduk yang pernah diinput akun ini TIDAK ikut terhapus: kolom
 *    warga.dibuat_oleh memakai ON DELETE SET NULL, dan nama/peran/wilayah
 *    penginput sudah tersalin sebagai teks di baris warga (migrasi 0015).
 *    Data tetap terlihat oleh admin dan oleh Kadus/RT pengganti di wilayah itu.
 *  - Slot posisi dikosongkan lebih dulu (profile_id memakai foreign key) supaya
 *    wilayahnya bisa didaftar ulang oleh orang lain.
 *  - Kalau akun tidak bisa dihapus karena masih dirujuk riwayat lain di
 *    database, akun DINONAKTIFKAN (tidak bisa login) alih-alih dihapus paksa.
 *  - Kalau keduanya gagal, slot dikembalikan seperti semula.
 */
export async function hapusAkunWilayah(prevState, formData) {
  const cek = await pastikanAdmin();
  if (cek.error) return { error: cek.error };

  const userId = String(formData.get("user_id") ?? "");
  if (!adalahUuid(userId)) return { error: "Akun tidak ditemukan." };
  if (userId === cek.user.id) return { error: "Anda tidak bisa menghapus akun Anda sendiri." };

  const adminClient = createAdminClient();

  const { data: profil } = await adminClient
    .from("profiles")
    .select("id, nama, role")
    .eq("id", userId)
    .maybeSingle();

  if (!profil) return { error: "Akun tidak ditemukan." };
  if (!["kadus", "ketua_rt"].includes(profil.role)) {
    return { error: "Hanya akun Kepala Dusun dan Ketua RT yang bisa dihapus dari sini." };
  }

  const { count: jumlahWarga } = await adminClient
    .from("warga")
    .select("id", { count: "exact", head: true })
    .eq("dibuat_oleh", userId);

  // 1) Kosongkan slot yang dipegang akun ini.
  const { data: slotLama, error: errSlot } = await adminClient
    .from("posisi_perangkat")
    .select("id, status, profile_id, diisi_pada")
    .eq("profile_id", userId);
  if (errSlot) return { error: "Gagal memeriksa slot posisi. Tidak ada yang diubah." };

  const idSlot = (slotLama ?? []).map((x) => x.id);
  if (idSlot.length > 0) {
    const { error } = await adminClient
      .from("posisi_perangkat")
      .update({
        status: "kosong",
        profile_id: null,
        dikosongkan_oleh: cek.user.id,
        dikosongkan_pada: new Date().toISOString(),
      })
      .in("id", idSlot);
    if (error) return { error: "Gagal mengosongkan slot posisi. Tidak ada yang diubah." };
  }

  async function kembalikanSlot() {
    for (const x of slotLama ?? []) {
      await adminClient
        .from("posisi_perangkat")
        .update({
          status: x.status,
          profile_id: x.profile_id,
          diisi_pada: x.diisi_pada,
          dikosongkan_oleh: null,
          dikosongkan_pada: null,
        })
        .eq("id", x.id);
    }
  }

  // 2) Hapus akun Auth (profil ikut terhapus lewat cascade).
  const { error: errHapus } = await adminClient.auth.admin.deleteUser(userId);

  if (!errHapus) {
    revalidatePath("/dashboard/kelola-akun");
    revalidatePath("/dashboard/posisi");
    revalidatePath("/dashboard/kependudukan");
    return { success: true, nama: profil.nama, jumlahWarga: jumlahWarga ?? 0, dinonaktifkan: false };
  }

  // 3) Cadangan: nonaktifkan (blokir login) kalau penghapusan ditolak database.
  const { error: errBan } = await adminClient.auth.admin.updateUserById(userId, {
    ban_duration: "876000h",
  });

  if (errBan) {
    await kembalikanSlot();
    return {
      error: `Akun tidak bisa dihapus (${errHapus.message}) dan tidak bisa dinonaktifkan. Slot dikembalikan seperti semula.`,
    };
  }

  revalidatePath("/dashboard/kelola-akun");
  revalidatePath("/dashboard/posisi");
  return { success: true, nama: profil.nama, jumlahWarga: jumlahWarga ?? 0, dinonaktifkan: true };
}
