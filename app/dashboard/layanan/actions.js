"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateStatusPengajuanLayanan(prevState, formData) {
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
    .from("pengajuan_layanan")
    .update({ status, catatan_admin, diproses_oleh: user?.id })
    .eq("id", id);

  if (error) {
    return { error: "Gagal menyimpan perubahan. Coba lagi." };
  }

  revalidatePath("/dashboard/layanan");
  revalidatePath(`/dashboard/layanan/${id}`);

  return { success: true };
}
