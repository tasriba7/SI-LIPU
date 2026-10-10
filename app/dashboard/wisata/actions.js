"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { pastikanKantorDesaBisaMenulis } from "@/lib/akses";
import { KATEGORI_WISATA } from "@/lib/wisata";

const EKSTENSI_DIIZINKAN = ["jpg", "jpeg", "png", "webp"];
const UKURAN_MAKS_MB = 8;

function segarkan(id) {
  revalidatePath("/dashboard/wisata");
  revalidatePath("/");
  revalidatePath("/wisata");
  if (id) revalidatePath(`/wisata/${id}`);
}

function namaFileDariUrl(url) {
  return url ? url.split("/").pop() : null;
}

/** Tambah (tanpa `id`) atau ubah (dengan `id`) satu destinasi wisata. */
export async function simpanWisata(prevState, formData) {
  const id = formData.get("id")?.toString() || null;
  const teks = (k, maks) => (formData.get(k)?.toString().trim() || "").slice(0, maks);

  const nama = teks("nama", 120);
  const kategori = teks("kategori", 30);
  const deskripsi = teks("deskripsi", 5000);
  const lokasi = teks("lokasi", 200);
  const jam_buka = teks("jam_buka", 200);
  const tiket = teks("tiket", 200);
  const kontak = teks("kontak", 200);
  const maps_url = teks("maps_url", 500);
  const unggulan = formData.get("unggulan") === "on";
  const aktif = formData.get("aktif") === "on";
  const foto = formData.get("foto");
  const adaFoto = foto && typeof foto === "object" && foto.size > 0;

  if (!nama) return { error: "Nama wisata wajib diisi." };
  if (!KATEGORI_WISATA.some((k) => k.nilai === kategori)) {
    return { error: "Kategori tidak valid." };
  }
  if (!id && !adaFoto) return { error: "Foto sampul wajib diunggah." };

  // Tautan peta: hanya http/https supaya tidak bisa disisipi javascript: dsb.
  if (maps_url) {
    try {
      const u = new URL(maps_url);
      if (!["http:", "https:"].includes(u.protocol)) throw new Error();
    } catch {
      return { error: "Tautan peta harus diawali https:// (mis. salinan dari Google Maps)." };
    }
  }

  if (adaFoto) {
    const ekstensi = (foto.name?.split(".").pop() || "").toLowerCase();
    if (!EKSTENSI_DIIZINKAN.includes(ekstensi)) return { error: "Format foto harus JPG, PNG, atau WEBP." };
    if (foto.size > UKURAN_MAKS_MB * 1024 * 1024) return { error: `Ukuran foto maksimal ${UKURAN_MAKS_MB}MB.` };
  }

  const supabase = await createClient();
  const akses = await pastikanKantorDesaBisaMenulis(supabase);
  if (akses.error) return { error: akses.error };

  const data = {
    nama,
    kategori,
    deskripsi: deskripsi || null,
    lokasi: lokasi || null,
    jam_buka: jam_buka || null,
    tiket: tiket || null,
    kontak: kontak || null,
    maps_url: maps_url || null,
    unggulan,
    aktif,
  };

  let fotoLamaUrl = null;
  if (id) {
    const { data: lama } = await supabase.from("wisata").select("foto_url").eq("id", id).maybeSingle();
    if (!lama) return { error: "Data wisata tidak ditemukan." };
    fotoLamaUrl = lama.foto_url;
  }

  let namaFileBaru = null;
  if (adaFoto) {
    const ekstensi = (foto.name.split(".").pop() || "").toLowerCase();
    namaFileBaru = `wisata-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ekstensi}`;
    const { error: errUpload } = await supabase.storage
      .from("desa-media")
      .upload(namaFileBaru, foto, { upsert: false, contentType: foto.type || undefined });
    if (errUpload) return { error: "Gagal mengunggah foto: " + errUpload.message };
    data.foto_url = supabase.storage.from("desa-media").getPublicUrl(namaFileBaru).data.publicUrl;
  }

  let error;
  if (id) {
    ({ error } = await supabase.from("wisata").update(data).eq("id", id));
  } else {
    data.dibuat_oleh = akses.user?.id ?? null;
    ({ error } = await supabase.from("wisata").insert(data));
  }

  if (error) {
    if (namaFileBaru) await supabase.storage.from("desa-media").remove([namaFileBaru]);
    return { error: "Gagal menyimpan data wisata. Pastikan migrasi 0040 sudah dijalankan." };
  }

  // Foto diganti -> hapus file lama supaya tidak jadi sampah.
  if (namaFileBaru && fotoLamaUrl) {
    const lama = namaFileDariUrl(fotoLamaUrl);
    if (lama) await supabase.storage.from("desa-media").remove([lama]);
  }

  segarkan(id);
  return { success: true };
}

/** Ubah satu flag boolean: "aktif" (tampil/sembunyi) atau "unggulan". */
export async function ubahStatusWisata(id, kolom, nilai) {
  if (!["aktif", "unggulan"].includes(kolom)) return { error: "Kolom tidak valid." };
  const supabase = await createClient();
  const akses = await pastikanKantorDesaBisaMenulis(supabase);
  if (akses.error) return { error: akses.error };

  const { error } = await supabase.from("wisata").update({ [kolom]: !!nilai }).eq("id", id);
  if (error) return { error: "Gagal mengubah status wisata." };
  segarkan(id);
  return { success: true };
}

export async function hapusWisata(id) {
  const supabase = await createClient();
  const akses = await pastikanKantorDesaBisaMenulis(supabase);
  if (akses.error) return { error: akses.error };

  const { data: item } = await supabase.from("wisata").select("foto_url").eq("id", id).maybeSingle();
  const { error } = await supabase.from("wisata").delete().eq("id", id);
  if (error) return { error: "Gagal menghapus wisata. Coba lagi." };

  const berkas = namaFileDariUrl(item?.foto_url);
  if (berkas) await supabase.storage.from("desa-media").remove([berkas]);

  segarkan(id);
  return { success: true };
}
