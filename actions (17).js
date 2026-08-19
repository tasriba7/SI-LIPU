"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function buatJenisLayanan(prevState, formData) {
  const nama_layanan = formData.get("nama_layanan")?.trim();
  const kategori = formData.get("kategori");
  const kode_prefix = formData.get("kode_prefix")?.trim().toUpperCase();
  const icon = formData.get("icon");
  const deskripsi = formData.get("deskripsi")?.trim() || null;
  const butuh_lookup_warga = formData.get("butuh_lookup_warga") === "on";
  const form_schema_raw = formData.get("form_schema_json") || "[]";

  if (!nama_layanan || !kategori || !kode_prefix || !icon) {
    return { error: "Nama layanan, kategori, prefix kode, dan ikon wajib diisi." };
  }
  if (!/^[A-Z]{2,5}$/.test(kode_prefix)) {
    return { error: "Prefix kode tracking harus 2-5 huruf kapital (mis. SRT, ADU)." };
  }

  let form_schema = [];
  try {
    form_schema = JSON.parse(form_schema_raw);
  } catch {
    return { error: "Field tambahan tidak valid, coba susun ulang." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("jenis_layanan_master").insert({
    nama_layanan,
    kategori,
    kode_prefix,
    icon,
    deskripsi,
    butuh_lookup_warga,
    form_schema,
    dibuat_oleh: user?.id,
  });

  if (error) {
    return { error: "Gagal menyimpan jenis layanan. Coba lagi." };
  }

  revalidatePath("/dashboard/jenis-layanan");
  return { success: true };
}

export async function toggleAktifJenisLayanan(id, aktifBaru) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("jenis_layanan_master")
    .update({ aktif: aktifBaru })
    .eq("id", id);

  if (error) {
    return { error: "Gagal mengubah status." };
  }

  revalidatePath("/dashboard/jenis-layanan");
  return { success: true };
}
