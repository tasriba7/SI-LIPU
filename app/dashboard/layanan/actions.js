"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { pastikanBisaMenulis } from "@/lib/akses";

export async function updateStatusPengajuanLayanan(prevState, formData) {
  const id = formData.get("id");
  const status = formData.get("status");
  const catatan_admin = formData.get("catatan_admin")?.trim() || null;

  if (!id || !status) {
    return { error: "Data tidak lengkap." };
  }
  if (!["diajukan", "diproses", "selesai", "ditolak"].includes(status)) {
    return { error: "Status tidak valid." };
  }
  if (status === "ditolak" && !catatan_admin) {
    return { error: "Isi catatan alasan penolakan agar warga tahu sebabnya." };
  }

  const supabase = await createClient();
  const _akses = await pastikanBisaMenulis(supabase);
  if (_akses.error) return { error: _akses.error };
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
