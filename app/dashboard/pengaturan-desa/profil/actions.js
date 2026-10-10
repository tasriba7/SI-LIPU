"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { pastikanAdmin } from "@/lib/akses";
import { BATAS_PROFIL } from "@/lib/profilDesa";

function ambil(formData, nama, batas) {
  const nilai = String(formData.get(nama) ?? "")
    .replace(/\r\n/g, "\n")
    .trim();
  if (nilai.length > batas) return { error: true };
  return { nilai: nilai || null };
}

export async function simpanProfilDesa(prevState, formData) {
  const supabase = await createClient();
  const akses = await pastikanAdmin(supabase);
  if (akses.error) return { error: akses.error };

  const daftar = [
    ["profil_sejarah", "Sejarah", BATAS_PROFIL.sejarah],
    ["profil_visi", "Visi", BATAS_PROFIL.visi],
    ["profil_misi", "Misi", BATAS_PROFIL.misi],
    ["batas_utara", "Batas utara", BATAS_PROFIL.batas],
    ["batas_selatan", "Batas selatan", BATAS_PROFIL.batas],
    ["batas_timur", "Batas timur", BATAS_PROFIL.batas],
    ["batas_barat", "Batas barat", BATAS_PROFIL.batas],
    ["luas_wilayah", "Luas wilayah", BATAS_PROFIL.luas],
  ];

  const dataUpdate = {};
  for (const [kolom, label, batas] of daftar) {
    const r = ambil(formData, kolom, batas);
    if (r.error) {
      return { error: `${label} terlalu panjang (maksimal ${batas.toLocaleString("id-ID")} karakter).` };
    }
    dataUpdate[kolom] = r.nilai;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  dataUpdate.updated_by = user?.id ?? null;

  const { error } = await supabase.from("config_desa").update(dataUpdate).eq("id", 1);

  if (error) {
    // Paling sering: migrasi 0035 belum dijalankan (kolom belum ada).
    return {
      error:
        "Gagal menyimpan profil desa. Pastikan migrasi 0035_profil_desa_lengkap.sql sudah dijalankan di Supabase.",
    };
  }

  revalidatePath("/profil");
  revalidatePath("/dashboard/pengaturan-desa/profil");
  return { success: true };
}
