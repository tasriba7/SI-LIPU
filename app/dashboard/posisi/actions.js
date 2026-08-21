"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function tambahSlotPosisi(prevState, formData) {
  const role = formData.get("role");
  const wilayah = formData.get("wilayah")?.trim();

  if (!role || !wilayah) {
    return { error: "Role dan wilayah wajib diisi." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("posisi_perangkat").insert({ role, wilayah });

  if (error) {
    // Kode error Postgres yang paling sering muncul untuk aksi ini, supaya
    // pesannya langsung mengarahkan ke penyebabnya alih-alih generik.
    // Lihat log server (Vercel > Deployments > Functions/Logs) untuk detail
    // lengkap error.code & error.message kalau pesan di bawah belum cukup.
    console.error("tambahSlotPosisi gagal:", error);

    if (error.code === "23505") {
      return { error: "Slot untuk role & wilayah ini sudah ada." };
    }
    if (error.code === "42501") {
      return {
        error:
          "Ditolak oleh izin akses database (RLS). Sesi login Anda mungkin sudah tidak valid — coba logout lalu login lagi.",
      };
    }
    if (error.code === "42P01") {
      return {
        error:
          "Tabel posisi_perangkat belum ada di database. Migration 0006_posisi_dan_pendaftaran.sql sepertinya belum dijalankan di project Supabase ini.",
      };
    }
    if (error.code === "23514") {
      return { error: "Nilai role tidak valid (harus Kadus atau Ketua RT)." };
    }
    return { error: `Gagal menambah slot: ${error.message || "penyebab tidak diketahui"}` };
  }

  revalidatePath("/dashboard/posisi");
  return { success: true };
}

/**
 * HANYA admin yang bisa lakukan ini (diproteksi middleware /dashboard).
 * Sesuai kesepakatan: mengosongkan slot supaya bisa didaftar ulang oleh
 * pemegang baru.
 */
export async function kosongkanSlot(prevState, formData) {
  const id = formData.get("id");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("posisi_perangkat")
    .update({
      status: "kosong",
      profile_id: null,
      dikosongkan_oleh: user?.id,
      dikosongkan_pada: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("kosongkanSlot gagal:", error);
    return { error: `Gagal mengosongkan slot: ${error.message || "penyebab tidak diketahui"}` };
  }

  revalidatePath("/dashboard/posisi");
  return { success: true };
}
