"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Server Action khusus staf desa yang sudah login (diproteksi middleware
 * /dashboard + RLS policy update di 0003_pengajuan_surat.sql).
 */
export async function updateStatusSurat(prevState, formData) {
  const id = formData.get("id");
  const status = formData.get("status");
  const catatan_admin = formData.get("catatan_admin")?.trim() || null;

  if (!id || !status) {
    return { error: "Data tidak lengkap." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("pengajuan_surat")
    .update({ status, catatan_admin, diproses_oleh: user?.id })
    .eq("id", id);

  if (error) {
    return { error: "Gagal menyimpan perubahan. Coba lagi." };
  }

  revalidatePath("/dashboard/surat");
  revalidatePath(`/dashboard/surat/${id}`);

  return { success: true };
}
