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
    if (error.code === "23505") {
      return { error: "Slot untuk role & wilayah ini sudah ada." };
    }
    return { error: "Gagal menambah slot." };
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
    return { error: "Gagal mengosongkan slot." };
  }

  revalidatePath("/dashboard/posisi");
  return { success: true };
}
