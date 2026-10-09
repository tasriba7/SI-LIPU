"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { pastikanAdmin } from "@/lib/akses";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Batalkan catatan mutasi (mis. salah memilih orang pada surat kematian):
 * penduduk kembali berstatus aktif dan dihitung lagi. Catatannya TIDAK dihapus,
 * hanya ditandai dibatalkan beserta alasannya. Hanya Administrator.
 * Pemeriksaan sebenarnya ada di fungsi database batalkan_mutasi() (lapis kedua).
 */
export async function batalkanMutasi(mutasiId, alasan) {
  const id = String(mutasiId ?? "");
  const teks = String(alasan ?? "").trim().slice(0, 300);
  if (!UUID.test(id)) return { error: "Catatan mutasi tidak valid." };
  if (teks.length < 3) return { error: "Alasan pembatalan wajib diisi." };

  const supabase = await createClient();
  const akses = await pastikanAdmin(supabase);
  if (akses.error) return { error: akses.error };

  const { error } = await supabase.rpc("batalkan_mutasi", {
    p_mutasi_id: id,
    p_alasan: teks,
  });
  if (error) {
    return {
      error:
        error.code === "P0001"
          ? error.message
          : "Gagal membatalkan. Pastikan migrasi 0032 sudah dijalankan, lalu coba lagi.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/kependudukan");
  revalidatePath("/dashboard/kependudukan/mutasi");
  revalidatePath("/");
  return { success: true };
}
