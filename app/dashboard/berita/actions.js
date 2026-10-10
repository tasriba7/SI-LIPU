"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { pastikanKantorDesaBisaMenulis } from "@/lib/akses";
import { KATEGORI_BERITA } from "@/lib/berita";

const EKSTENSI_DIIZINKAN = ["jpg", "jpeg", "png", "webp"];
const UKURAN_MAKS_MB = 8;

function segarkan(id) {
  revalidatePath("/dashboard/berita");
  revalidatePath("/");
  revalidatePath("/berita");
  if (id) revalidatePath(`/berita/${id}`);
}

function namaFileDariUrl(url) {
  return url ? url.split("/").pop() : null;
}

/** Ringkasan otomatis dari isi: ~160 karakter, dipotong di batas kata. */
function ringkasOtomatis(isi) {
  const datar = isi.replace(/\s+/g, " ").trim();
  if (datar.length <= 160) return datar;
  return datar.slice(0, 160).replace(/\s+\S*$/, "") + "…";
}

/** Tambah (tanpa `id`) atau ubah (dengan `id`) satu berita. */
export async function simpanBerita(prevState, formData) {
  const id = formData.get("id")?.toString() || null;
  const teks = (k, maks) => (formData.get(k)?.toString().trim() || "").slice(0, maks);

  const judul = teks("judul", 200);
  const kategori = teks("kategori", 30);
  const ringkasan = teks("ringkasan", 300);
  const isi = teks("isi", 50000);
  const tanggal = teks("tanggal", 10); // yyyy-mm-dd, opsional
  const terbit = formData.get("terbit") === "on";
  const foto = formData.get("foto");
  const adaFoto = foto && typeof foto === "object" && foto.size > 0;
  const hapusFoto = formData.get("hapus_foto") === "1";

  if (!judul) return { error: "Judul berita wajib diisi." };
  if (!isi) return { error: "Isi berita wajib diisi." };
  if (!KATEGORI_BERITA.some((k) => k.nilai === kategori)) return { error: "Kategori tidak valid." };
  if (tanggal && !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return { error: "Format tanggal tidak valid." };

  if (adaFoto) {
    const ekstensi = (foto.name?.split(".").pop() || "").toLowerCase();
    if (!EKSTENSI_DIIZINKAN.includes(ekstensi)) return { error: "Format foto harus JPG, PNG, atau WEBP." };
    if (foto.size > UKURAN_MAKS_MB * 1024 * 1024) return { error: `Ukuran foto maksimal ${UKURAN_MAKS_MB}MB.` };
  }

  const supabase = await createClient();
  const akses = await pastikanKantorDesaBisaMenulis(supabase);
  if (akses.error) return { error: akses.error };

  let lama = null;
  if (id) {
    const { data } = await supabase.from("berita").select("foto_url, tanggal_terbit").eq("id", id).maybeSingle();
    if (!data) return { error: "Berita tidak ditemukan." };
    lama = data;
  }

  const data = {
    judul,
    kategori,
    ringkasan: ringkasan || ringkasOtomatis(isi),
    isi,
    terbit,
  };

  // Tanggal terbit: pakai yang diisi admin (siang UTC agar tidak bergeser hari
  // di zona waktu Indonesia); kalau kosong dan berita diterbitkan, pakai
  // tanggal terbit lama atau sekarang.
  if (tanggal) data.tanggal_terbit = new Date(`${tanggal}T12:00:00Z`).toISOString();
  else if (terbit && !lama?.tanggal_terbit) data.tanggal_terbit = new Date().toISOString();

  let namaFileBaru = null;
  if (adaFoto) {
    const ekstensi = (foto.name.split(".").pop() || "").toLowerCase();
    namaFileBaru = `berita-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ekstensi}`;
    const { error: errUpload } = await supabase.storage
      .from("desa-media")
      .upload(namaFileBaru, foto, { upsert: false, contentType: foto.type || undefined });
    if (errUpload) return { error: "Gagal mengunggah foto: " + errUpload.message };
    data.foto_url = supabase.storage.from("desa-media").getPublicUrl(namaFileBaru).data.publicUrl;
  } else if (hapusFoto) {
    data.foto_url = null;
  }

  let error;
  if (id) {
    ({ error } = await supabase.from("berita").update(data).eq("id", id));
  } else {
    data.dibuat_oleh = akses.user?.id ?? null;
    ({ error } = await supabase.from("berita").insert(data));
  }

  if (error) {
    if (namaFileBaru) await supabase.storage.from("desa-media").remove([namaFileBaru]);
    return { error: "Gagal menyimpan berita. Pastikan migrasi 0041 sudah dijalankan." };
  }

  // Foto diganti/dihapus -> bersihkan file lama.
  if (lama?.foto_url && (namaFileBaru || hapusFoto)) {
    const berkas = namaFileDariUrl(lama.foto_url);
    if (berkas) await supabase.storage.from("desa-media").remove([berkas]);
  }

  segarkan(id);
  return { success: true };
}

/** Terbitkan atau tarik kembali jadi draf. */
export async function ubahStatusBerita(id, terbit) {
  const supabase = await createClient();
  const akses = await pastikanKantorDesaBisaMenulis(supabase);
  if (akses.error) return { error: akses.error };

  const { data: b } = await supabase.from("berita").select("tanggal_terbit").eq("id", id).maybeSingle();
  if (!b) return { error: "Berita tidak ditemukan." };

  const ubah = { terbit: !!terbit };
  if (terbit && !b.tanggal_terbit) ubah.tanggal_terbit = new Date().toISOString();

  const { error } = await supabase.from("berita").update(ubah).eq("id", id);
  if (error) return { error: "Gagal mengubah status berita." };
  segarkan(id);
  return { success: true };
}

export async function hapusBerita(id) {
  const supabase = await createClient();
  const akses = await pastikanKantorDesaBisaMenulis(supabase);
  if (akses.error) return { error: akses.error };

  const { data: item } = await supabase.from("berita").select("foto_url").eq("id", id).maybeSingle();
  const { error } = await supabase.from("berita").delete().eq("id", id);
  if (error) return { error: "Gagal menghapus berita. Coba lagi." };

  const berkas = namaFileDariUrl(item?.foto_url);
  if (berkas) await supabase.storage.from("desa-media").remove([berkas]);

  segarkan(id);
  return { success: true };
}
