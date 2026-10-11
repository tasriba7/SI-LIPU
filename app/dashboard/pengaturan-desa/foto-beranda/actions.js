"use server";

import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { pastikanAdmin } from "@/lib/akses";
import { MAKS_FOTO_HERO } from "@/lib/fotoHero";

const EKSTENSI_DIIZINKAN = ["jpg", "jpeg", "png", "webp"];
const UKURAN_MAKS_MB = 8;
const BUCKET = "desa-media";
const SISI_MAKS_PX = 3000;

// Lapis kedua setelah pengecilan di browser: pastikan tidak ada foto > 3000px
// yang tersimpan, diputar sesuai EXIF, dan disimpan sebagai WEBP berkualitas tinggi.
// Kalau sharp gagal, berkas asli tetap dipakai.
async function siapkanFoto(file, ekstensiAsli) {
  const asli = Buffer.from(await file.arrayBuffer());
  try {
    const data = await sharp(asli)
      .rotate()
      .resize({ width: SISI_MAKS_PX, height: SISI_MAKS_PX, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 88 })
      .toBuffer();
    return { data, ekstensi: "webp", tipe: "image/webp" };
  } catch {
    return { data: asli, ekstensi: ekstensiAsli, tipe: file.type || undefined };
  }
}

function segarkan() {
  revalidatePath("/");
  revalidatePath("/dashboard/pengaturan-desa/foto-beranda");
}

export async function tambahFotoHero(prevState, formData) {
  const files = formData
    .getAll("foto")
    .filter((f) => f && typeof f === "object" && f.size > 0);
  if (files.length === 0) return { error: "Pilih minimal satu foto dulu." };

  const supabase = await createClient();
  const akses = await pastikanAdmin(supabase);
  if (akses.error) return { error: akses.error };

  const { data: ada, error: errorBaca } = await supabase
    .from("foto_hero_beranda")
    .select("urutan");
  if (errorBaca) {
    return { error: "Gagal membaca data. Pastikan migrasi 0048 sudah dijalankan." };
  }
  if ((ada?.length ?? 0) + files.length > MAKS_FOTO_HERO) {
    return {
      error: `Maksimal ${MAKS_FOTO_HERO} foto. Sekarang ada ${ada?.length ?? 0}, hapus dulu yang tidak dipakai.`,
    };
  }

  // Validasi semua dulu supaya tidak ada yang terunggah setengah-setengah.
  for (const f of files) {
    const ekstensi = (f.name?.split(".").pop() || "").toLowerCase();
    if (!EKSTENSI_DIIZINKAN.includes(ekstensi)) {
      return { error: `"${f.name}": format harus JPG, PNG, atau WEBP.` };
    }
    if (f.size > UKURAN_MAKS_MB * 1024 * 1024) {
      return { error: `"${f.name}": ukuran maksimal ${UKURAN_MAKS_MB}MB.` };
    }
  }

  let urutan = Math.max(-1, ...(ada ?? []).map((r) => r.urutan ?? 0)) + 1;
  const baris = [];
  for (const [i, f] of files.entries()) {
    const ekstensiAsli = (f.name.split(".").pop() || "").toLowerCase();
    const { data, ekstensi, tipe } = await siapkanFoto(f, ekstensiAsli);
    const namaFile = `hero-${Date.now()}-${i}.${ekstensi}`;
    const { error: errorUpload } = await supabase.storage
      .from(BUCKET)
      .upload(namaFile, data, { upsert: true, contentType: tipe });
    if (errorUpload) {
      return { error: `Gagal mengunggah "${f.name}": ${errorUpload.message}` };
    }
    baris.push({
      gambar_url: supabase.storage.from(BUCKET).getPublicUrl(namaFile).data.publicUrl,
      urutan: urutan++,
      created_by: akses.user?.id ?? null,
    });
  }

  const { error } = await supabase.from("foto_hero_beranda").insert(baris);
  if (error) return { error: "Gagal menyimpan foto. Coba lagi." };

  segarkan();
  return { success: `${baris.length} foto ditambahkan.` };
}

export async function hapusFotoHero(formData) {
  const id = formData.get("id")?.toString();
  if (!id) return;

  const supabase = await createClient();
  const akses = await pastikanAdmin(supabase);
  if (akses.error) return;

  const { data: foto } = await supabase
    .from("foto_hero_beranda")
    .select("gambar_url")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("foto_hero_beranda").delete().eq("id", id);
  if (error) return;

  // Hapus berkasnya juga dari storage (best-effort; gagal pun tidak masalah).
  const path = foto?.gambar_url?.split(`/${BUCKET}/`)[1];
  if (path) {
    try {
      await supabase.storage.from(BUCKET).remove([decodeURIComponent(path)]);
    } catch {}
  }
  segarkan();
}

export async function geserFotoHero(formData) {
  const id = formData.get("id")?.toString();
  const arah = formData.get("arah")?.toString(); // "naik" | "turun"
  if (!id || !["naik", "turun"].includes(arah)) return;

  const supabase = await createClient();
  const akses = await pastikanAdmin(supabase);
  if (akses.error) return;

  const { data } = await supabase
    .from("foto_hero_beranda")
    .select("id")
    .order("urutan", { ascending: true })
    .order("created_at", { ascending: true });
  const ids = (data ?? []).map((r) => r.id);
  const i = ids.indexOf(id);
  const j = arah === "naik" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ids.length) return;

  [ids[i], ids[j]] = [ids[j], ids[i]];
  // Tulis ulang urutan 0..n supaya selalu rapi & tanpa nilai kembar.
  await Promise.all(
    ids.map((x, n) => supabase.from("foto_hero_beranda").update({ urutan: n }).eq("id", x))
  );
  segarkan();
}
