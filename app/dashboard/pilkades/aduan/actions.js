"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { pastikanKelolaPilkades } from "@/lib/akses";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Balas aduan Pilkades = aduan diproses. Tidak ada opsi tolak.
 * Database yang menegakkan aturan (fungsi balas_aduan_pilkades, migrasi 0070).
 */
export async function balasAduanPilkades(prevState, formData) {
  const id = String(formData.get("id") ?? "");
  const balasan = String(formData.get("balasan") ?? "").trim();

  if (!UUID.test(id)) return { error: "Aduan tidak valid." };
  if (!balasan) return { error: "Tulis isi balasan terlebih dahulu." };
  if (balasan.length > 1000) return { error: "Balasan terlalu panjang (maksimal 1000 karakter)." };

  const supabase = await createClient();
  const akses = await pastikanKelolaPilkades(supabase);
  if (akses.error) return { error: akses.error };

  const { data, error } = await supabase.rpc("balas_aduan_pilkades", {
    p_id: id,
    p_balasan: balasan,
  });
  if (error) return { error: "Gagal mengirim balasan. Coba lagi." };
  if (!data) return { error: "Aduan ini sudah dibalas atau tidak bisa Anda tangani." };

  revalidatePath("/dashboard/pilkades/aduan");
  revalidatePath(`/dashboard/pilkades/aduan/${id}`);
  return { success: true };
}
