"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { pastikanKantorDesaBisaMenulis } from "@/lib/akses";
import { JENIS_APBDES, parseRupiah } from "@/lib/apbdes";

const UKURAN_MAKS_MB = 8;

function segarkan(tahun) {
  revalidatePath("/dashboard/apbdes");
  revalidatePath("/");
  revalidatePath("/apbdes");
  if (tahun) revalidatePath(`/dashboard/apbdes/${tahun}`);
}

function namaFileDariUrl(url) {
  return url ? url.split("/").pop() : null;
}

function tahunValid(v) {
  const n = Number(v);
  return Number.isInteger(n) && n >= 2000 && n <= 2100 ? n : null;
}

/** Buat tahun anggaran baru, opsional menyalin struktur dari tahun terakhir. */
export async function buatTahun(prevState, formData) {
  const tahun = tahunValid(formData.get("tahun"));
  const salin = formData.get("salin") === "on";
  if (!tahun) return { error: "Tahun harus berupa angka 2000–2100." };

  const supabase = await createClient();
  const akses = await pastikanKantorDesaBisaMenulis(supabase);
  if (akses.error) return { error: akses.error };

  const { data: ada } = await supabase.from("apbdes_tahun").select("tahun").eq("tahun", tahun).maybeSingle();
  if (ada) return { error: `APBDes tahun ${tahun} sudah ada.` };

  const { error } = await supabase.from("apbdes_tahun").insert({ tahun, terbit: false });
  if (error) return { error: "Gagal membuat tahun. Pastikan migrasi 0041 sudah dijalankan." };

  if (salin) {
    // Salin dari tahun terdekat sebelumnya yang punya rincian; realisasi dikosongkan.
    const { data: sebelumnya } = await supabase
      .from("apbdes_item")
      .select("tahun")
      .lt("tahun", tahun)
      .order("tahun", { ascending: false })
      .limit(1);
    const asal = sebelumnya?.[0]?.tahun;
    if (asal) {
      const { data: items } = await supabase
        .from("apbdes_item")
        .select("jenis, kelompok, uraian, anggaran, urutan")
        .eq("tahun", asal);
      if (items?.length) {
        await supabase
          .from("apbdes_item")
          .insert(items.map((i) => ({ ...i, tahun, realisasi: 0 })));
      }
    }
  }

  segarkan(tahun);
  return { success: true, tahun };
}

/** Ubah catatan, status terbit, dan dokumen PDF satu tahun. */
export async function simpanMetaTahun(prevState, formData) {
  const tahun = tahunValid(formData.get("tahun"));
  if (!tahun) return { error: "Tahun tidak valid." };

  const catatan = (formData.get("catatan")?.toString().trim() || "").slice(0, 2000);
  const terbit = formData.get("terbit") === "on";
  const dokumen = formData.get("dokumen");
  const adaDokumen = dokumen && typeof dokumen === "object" && dokumen.size > 0;
  const hapusDokumen = formData.get("hapus_dokumen") === "on";

  if (adaDokumen) {
    const ekstensi = (dokumen.name?.split(".").pop() || "").toLowerCase();
    if (ekstensi !== "pdf") return { error: "Dokumen harus berformat PDF." };
    if (dokumen.size > UKURAN_MAKS_MB * 1024 * 1024) return { error: `Ukuran dokumen maksimal ${UKURAN_MAKS_MB}MB.` };
  }

  const supabase = await createClient();
  const akses = await pastikanKantorDesaBisaMenulis(supabase);
  if (akses.error) return { error: akses.error };

  const { data: lama } = await supabase.from("apbdes_tahun").select("dokumen_url").eq("tahun", tahun).maybeSingle();
  if (!lama) return { error: "Tahun tidak ditemukan." };

  const ubah = { catatan: catatan || null, terbit };

  let namaBaru = null;
  if (adaDokumen) {
    namaBaru = `apbdes-${tahun}-${Date.now()}.pdf`;
    const { error: errUpload } = await supabase.storage
      .from("desa-media")
      .upload(namaBaru, dokumen, { upsert: false, contentType: "application/pdf" });
    if (errUpload) return { error: "Gagal mengunggah dokumen: " + errUpload.message };
    ubah.dokumen_url = supabase.storage.from("desa-media").getPublicUrl(namaBaru).data.publicUrl;
  } else if (hapusDokumen) {
    ubah.dokumen_url = null;
  }

  const { error } = await supabase.from("apbdes_tahun").update(ubah).eq("tahun", tahun);
  if (error) {
    if (namaBaru) await supabase.storage.from("desa-media").remove([namaBaru]);
    return { error: "Gagal menyimpan pengaturan tahun." };
  }

  if (lama.dokumen_url && (namaBaru || hapusDokumen)) {
    const berkas = namaFileDariUrl(lama.dokumen_url);
    if (berkas) await supabase.storage.from("desa-media").remove([berkas]);
  }

  segarkan(tahun);
  return { success: "Tersimpan." };
}

export async function hapusTahun(tahun) {
  const t = tahunValid(tahun);
  if (!t) return { error: "Tahun tidak valid." };
  const supabase = await createClient();
  const akses = await pastikanKantorDesaBisaMenulis(supabase);
  if (akses.error) return { error: akses.error };

  const { data: lama } = await supabase.from("apbdes_tahun").select("dokumen_url").eq("tahun", t).maybeSingle();
  // Rincian ikut terhapus lewat ON DELETE CASCADE.
  const { error } = await supabase.from("apbdes_tahun").delete().eq("tahun", t);
  if (error) return { error: "Gagal menghapus tahun APBDes." };

  const berkas = namaFileDariUrl(lama?.dokumen_url);
  if (berkas) await supabase.storage.from("desa-media").remove([berkas]);

  segarkan(t);
  return { success: true };
}

/** Tambah (tanpa `id`) atau ubah (dengan `id`) satu baris rincian. */
export async function simpanItem(prevState, formData) {
  const id = formData.get("id")?.toString() || null;
  const tahun = tahunValid(formData.get("tahun"));
  const jenis = formData.get("jenis")?.toString();
  const kelompok = (formData.get("kelompok")?.toString().trim() || "").slice(0, 150);
  const uraian = (formData.get("uraian")?.toString().trim() || "").slice(0, 250);
  const anggaran = parseRupiah(formData.get("anggaran"));
  const realisasi = parseRupiah(formData.get("realisasi"));

  if (!tahun) return { error: "Tahun tidak valid." };
  if (!JENIS_APBDES.some((j) => j.nilai === jenis)) return { error: "Jenis tidak valid." };
  if (!uraian) return { error: "Uraian wajib diisi." };
  if (anggaran > 9e15 || realisasi > 9e15) return { error: "Nilai terlalu besar." };

  const supabase = await createClient();
  const akses = await pastikanKantorDesaBisaMenulis(supabase);
  if (akses.error) return { error: akses.error };

  const data = { tahun, jenis, kelompok: kelompok || null, uraian, anggaran, realisasi };

  let error;
  if (id) {
    ({ error } = await supabase.from("apbdes_item").update(data).eq("id", id));
  } else {
    // Baris baru ditaruh paling bawah di jenisnya.
    const { data: terakhir } = await supabase
      .from("apbdes_item")
      .select("urutan")
      .eq("tahun", tahun)
      .eq("jenis", jenis)
      .order("urutan", { ascending: false })
      .limit(1);
    data.urutan = (terakhir?.[0]?.urutan ?? 0) + 1;
    ({ error } = await supabase.from("apbdes_item").insert(data));
  }
  if (error) return { error: "Gagal menyimpan rincian." };

  segarkan(tahun);
  return { success: true };
}

export async function hapusItem(id, tahun) {
  const supabase = await createClient();
  const akses = await pastikanKantorDesaBisaMenulis(supabase);
  if (akses.error) return { error: akses.error };

  const { error } = await supabase.from("apbdes_item").delete().eq("id", id);
  if (error) return { error: "Gagal menghapus rincian." };

  segarkan(tahunValid(tahun));
  return { success: true };
}
