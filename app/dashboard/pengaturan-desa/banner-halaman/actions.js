"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { pastikanAdmin } from "@/lib/akses";
import { cariHalamanBanner } from "@/lib/bannerHalaman";

const EKSTENSI_DIIZINKAN = ["jpg", "jpeg", "png", "webp"];
const UKURAN_MAKS_MB = 8;

export async function simpanBannerHalaman(prevState, formData) {
  const kunci = formData.get("kunci")?.toString();
  const halaman = cariHalamanBanner(kunci);
  if (!halaman) return { error: "Menu tidak dikenal." };

  const gambar = formData.get("gambar");
  const hapus = formData.get("hapus") === "1";
  const adaFile = gambar && typeof gambar === "object" && gambar.size > 0;

  if (!adaFile && !hapus) return { error: "Pilih gambar dulu." };

  const supabase = await createClient();
  const akses = await pastikanAdmin(supabase);
  if (akses.error) return { error: akses.error };

  let gambarUrl = null;

  if (adaFile) {
    const ekstensi = (gambar.name?.split(".").pop() || "").toLowerCase();
    if (!EKSTENSI_DIIZINKAN.includes(ekstensi)) {
      return { error: "Format gambar harus JPG, PNG, atau WEBP." };
    }
    if (gambar.size > UKURAN_MAKS_MB * 1024 * 1024) {
      return { error: `Ukuran gambar maksimal ${UKURAN_MAKS_MB}MB.` };
    }

    const namaFile = `banner-${kunci}-${Date.now()}.${ekstensi}`;
    const { error: errorUpload } = await supabase.storage
      .from("desa-media")
      .upload(namaFile, gambar, { upsert: true, contentType: gambar.type || undefined });
    if (errorUpload) return { error: "Gagal mengunggah gambar: " + errorUpload.message };

    gambarUrl = supabase.storage.from("desa-media").getPublicUrl(namaFile).data.publicUrl;
  }

  const { error } = await supabase.from("banner_halaman").upsert(
    { halaman: kunci, gambar_url: gambarUrl, updated_by: akses.user?.id ?? null },
    { onConflict: "halaman" }
  );
  if (error) {
    return { error: "Gagal menyimpan banner. Pastikan migrasi 0039 sudah dijalankan." };
  }

  revalidatePath(halaman.href);
  revalidatePath("/dashboard/pengaturan-desa/banner-halaman");
  return { success: adaFile ? "Banner tersimpan." : "Banner dihapus." };
}
