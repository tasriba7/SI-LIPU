"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const EKSTENSI_DIIZINKAN = ["jpg", "jpeg", "png", "webp"];
const UKURAN_MAKS_MB = 8;

export async function simpanPengaturanDesa(prevState, formData) {
  const jenis_wilayah = formData.get("jenis_wilayah") || "Desa";
  const nama_desa = formData.get("nama_desa")?.toString().trim();
  const provinsi = formData.get("provinsi")?.toString().trim();
  const kabupaten = formData.get("kabupaten")?.toString().trim();
  const kecamatan = formData.get("kecamatan")?.toString().trim();
  const alamat = formData.get("alamat")?.toString().trim();
  const foto = formData.get("foto");
  const hapusFoto = formData.get("hapus_foto") === "1";

  if (!nama_desa) {
    return { error: "Nama desa/kelurahan wajib diisi." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const dataUpdate = {
    jenis_wilayah,
    nama_desa,
    provinsi: provinsi || null,
    kabupaten: kabupaten || null,
    kecamatan: kecamatan || null,
    alamat: alamat || null,
    updated_by: user?.id ?? null,
  };

  // Foto baru diunggah hanya kalau admin memang memilih file (input kosong =
  // foto lama tetap dipakai, tidak perlu upload ulang).
  if (foto && typeof foto === "object" && foto.size > 0) {
    const ekstensi = (foto.name?.split(".").pop() || "").toLowerCase();

    if (!EKSTENSI_DIIZINKAN.includes(ekstensi)) {
      return { error: "Format foto harus JPG, PNG, atau WEBP." };
    }
    if (foto.size > UKURAN_MAKS_MB * 1024 * 1024) {
      return { error: `Ukuran foto maksimal ${UKURAN_MAKS_MB}MB.` };
    }

    const namaFile = `beranda-${Date.now()}.${ekstensi}`;
    const { error: errorUpload } = await supabase.storage
      .from("desa-media")
      .upload(namaFile, foto, {
        upsert: true,
        contentType: foto.type || undefined,
      });

    if (errorUpload) {
      return { error: "Gagal mengunggah foto: " + errorUpload.message };
    }

    const { data: publicUrlData } = supabase.storage
      .from("desa-media")
      .getPublicUrl(namaFile);

    dataUpdate.foto_url = publicUrlData.publicUrl;
  } else if (hapusFoto) {
    dataUpdate.foto_url = null;
  }

  const { error } = await supabase
    .from("config_desa")
    .update(dataUpdate)
    .eq("id", 1);

  if (error) {
    return { error: "Gagal menyimpan pengaturan desa. Coba lagi." };
  }

  revalidatePath("/dashboard/pengaturan-desa");
  revalidatePath("/");
  return { success: true };
}
