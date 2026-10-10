"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { pastikanAdmin } from "@/lib/akses";
import { STATUS_LAPORAN } from "@/lib/laporanData";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Admin mengubah status laporan data warga + menulis catatan singkat.
 * Dijaga di server (pastikanAdmin) dan di RLS (policy adalah_admin, migrasi 0038).
 */
export async function ubahStatusLaporan(prevState, formData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const catatan = String(formData.get("catatan_admin") ?? "").trim() || null;

  if (!UUID_RE.test(id)) return { error: "Laporan tidak valid." };
  if (!STATUS_LAPORAN.includes(status)) return { error: "Status tidak valid." };
  if (catatan && catatan.length > 500) return { error: "Catatan maksimal 500 huruf." };
  if (status === "ditolak" && !catatan) {
    return { error: "Isi catatan alasan penolakan agar jelas sebabnya." };
  }

  const supabase = await createClient();
  const akses = await pastikanAdmin(supabase);
  if (akses.error) return { error: akses.error };

  const { error } = await supabase
    .from("laporan_data_warga")
    .update({ status, catatan_admin: catatan, ditangani_oleh: akses.user.id })
    .eq("id", id);

  if (error) return { error: "Gagal menyimpan. Coba lagi." };

  revalidatePath("/dashboard/laporan-data");
  return { success: true };
}
