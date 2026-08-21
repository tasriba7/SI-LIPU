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
  const logo = formData.get("logo");
  const hapusLogo = formData.get("hapus_logo") === "1";
  const kepala_desa_nama = formData.get("kepala_desa_nama")?.toString().trim();
  const kepala_desa_sambutan = formData.get("kepala_desa_sambutan")?.toString().trim();
  const kepalaDesaFoto = formData.get("kepala_desa_foto");
  const hapusFotoKepalaDesa = formData.get("hapus_kepala_desa_foto") === "1";

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
    kepala_desa_nama: kepala_desa_nama || null,
    kepala_desa_sambutan: kepala_desa_sambutan || null,
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

  // Logo desa — dipakai di header publik & lambang beranda, terpisah dari
  // foto latar di atas. Pola upload sama persis, cuma prefix nama file beda.
  if (logo && typeof logo === "object" && logo.size > 0) {
    const ekstensi = (logo.name?.split(".").pop() || "").toLowerCase();

    if (!EKSTENSI_DIIZINKAN.includes(ekstensi)) {
      return { error: "Format logo harus JPG, PNG, atau WEBP." };
    }
    if (logo.size > UKURAN_MAKS_MB * 1024 * 1024) {
      return { error: `Ukuran logo maksimal ${UKURAN_MAKS_MB}MB.` };
    }

    const namaFile = `logo-${Date.now()}.${ekstensi}`;
    const { error: errorUpload } = await supabase.storage
      .from("desa-media")
      .upload(namaFile, logo, {
        upsert: true,
        contentType: logo.type || undefined,
      });

    if (errorUpload) {
      return { error: "Gagal mengunggah logo: " + errorUpload.message };
    }

    const { data: publicUrlData } = supabase.storage
      .from("desa-media")
      .getPublicUrl(namaFile);

    dataUpdate.logo_url = publicUrlData.publicUrl;
  } else if (hapusLogo) {
    dataUpdate.logo_url = null;
  }

  // Foto Kepala Desa — pola upload sama persis dengan foto/logo di atas.
  if (kepalaDesaFoto && typeof kepalaDesaFoto === "object" && kepalaDesaFoto.size > 0) {
    const ekstensi = (kepalaDesaFoto.name?.split(".").pop() || "").toLowerCase();

    if (!EKSTENSI_DIIZINKAN.includes(ekstensi)) {
      return { error: "Format foto Kepala Desa harus JPG, PNG, atau WEBP." };
    }
    if (kepalaDesaFoto.size > UKURAN_MAKS_MB * 1024 * 1024) {
      return { error: `Ukuran foto Kepala Desa maksimal ${UKURAN_MAKS_MB}MB.` };
    }

    const namaFile = `kepala-desa-${Date.now()}.${ekstensi}`;
    const { error: errorUpload } = await supabase.storage
      .from("desa-media")
      .upload(namaFile, kepalaDesaFoto, {
        upsert: true,
        contentType: kepalaDesaFoto.type || undefined,
      });

    if (errorUpload) {
      return { error: "Gagal mengunggah foto Kepala Desa: " + errorUpload.message };
    }

    const { data: publicUrlData } = supabase.storage
      .from("desa-media")
      .getPublicUrl(namaFile);

    dataUpdate.kepala_desa_foto_url = publicUrlData.publicUrl;
  } else if (hapusFotoKepalaDesa) {
    dataUpdate.kepala_desa_foto_url = null;
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
