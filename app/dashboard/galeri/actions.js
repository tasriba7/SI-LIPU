"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const EKSTENSI_DIIZINKAN = ["jpg", "jpeg", "png", "webp"];
const UKURAN_MAKS_MB = 8;

export async function tambahGaleri(prevState, formData) {
  const judul = formData.get("judul")?.toString().trim();
  const deskripsi = formData.get("deskripsi")?.toString().trim();
  const foto = formData.get("foto");

  if (!judul) {
    return { error: "Judul kegiatan wajib diisi." };
  }
  if (!foto || typeof foto !== "object" || foto.size === 0) {
    return { error: "Foto kegiatan wajib diunggah." };
  }

  const ekstensi = (foto.name?.split(".").pop() || "").toLowerCase();
  if (!EKSTENSI_DIIZINKAN.includes(ekstensi)) {
    return { error: "Format foto harus JPG, PNG, atau WEBP." };
  }
  if (foto.size > UKURAN_MAKS_MB * 1024 * 1024) {
    return { error: `Ukuran foto maksimal ${UKURAN_MAKS_MB}MB.` };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const namaFile = `galeri-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${ekstensi}`;

  const { error: errorUpload } = await supabase.storage
    .from("desa-media")
    .upload(namaFile, foto, {
      upsert: false,
      contentType: foto.type || undefined,
    });

  if (errorUpload) {
    return { error: "Gagal mengunggah foto: " + errorUpload.message };
  }

  const { data: publicUrlData } = supabase.storage
    .from("desa-media")
    .getPublicUrl(namaFile);

  const { error: errorInsert } = await supabase.from("galeri_kegiatan").insert({
    judul,
    deskripsi: deskripsi || null,
    foto_url: publicUrlData.publicUrl,
    dibuat_oleh: user?.id ?? null,
  });

  if (errorInsert) {
    // Foto sudah kadung terunggah — bersihkan supaya tidak jadi sampah file.
    await supabase.storage.from("desa-media").remove([namaFile]);
    return { error: "Gagal menyimpan data galeri. Coba lagi." };
  }

  revalidatePath("/dashboard/galeri");
  revalidatePath("/");
  revalidatePath("/galeri");
  return { success: true };
}

export async function hapusGaleri(prevState, formData) {
  const id = formData.get("id")?.toString();
  if (!id) {
    return { error: "ID galeri tidak valid." };
  }

  const supabase = await createClient();

  const { data: item } = await supabase
    .from("galeri_kegiatan")
    .select("foto_url")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("galeri_kegiatan").delete().eq("id", id);

  if (error) {
    return { error: "Gagal menghapus foto galeri. Coba lagi." };
  }

  // Hapus juga file di storage supaya tidak jadi sampah — nama file selalu
  // di segmen terakhir URL publik Supabase Storage.
  if (item?.foto_url) {
    const namaFile = item.foto_url.split("/").pop();
    if (namaFile) {
      await supabase.storage.from("desa-media").remove([namaFile]);
    }
  }

  revalidatePath("/dashboard/galeri");
  revalidatePath("/");
  revalidatePath("/galeri");
  return { success: true };
}
