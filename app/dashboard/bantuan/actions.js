"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { pastikanAdmin } from "@/lib/akses";
import { KATEGORI_BANTUAN } from "@/lib/bantuan";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAKS_WARGA_SEKALI_TAMBAH = 200;

function segarkan() {
  revalidatePath("/dashboard/bantuan");
  revalidatePath("/layanan/bantuan");
}

/**
 * Cari warga AKTIF untuk dipilih sebagai penerima. Hanya admin. Dipicu tombol
 * "Cari" di form (bukan otomatis saat mengetik). Maksimal 20 hasil.
 */
export async function cariWargaUntukBantuan(kata) {
  const supabase = await createClient();
  const akses = await pastikanAdmin(supabase);
  if (akses.error) return { error: akses.error };

  // Buang karakter yang punya arti khusus di filter PostgREST/ILIKE.
  const bersih = String(kata ?? "")
    .replace(/[,()*%_\\"']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);

  if (bersih.length < 3) {
    return { error: "Ketik minimal 3 huruf nama atau angka NIK." };
  }

  const { data, error } = await supabase
    .from("warga")
    .select("id, nik, nama_lengkap, dusun, rt, rw")
    .eq("status_kependudukan", "aktif")
    .or(`nama_lengkap.ilike.%${bersih}%,nik.ilike.%${bersih}%`)
    .order("nama_lengkap")
    .limit(20);

  if (error) {
    console.error("cariWargaUntukBantuan gagal:", error);
    return { error: "Gagal mencari data penduduk. Coba lagi." };
  }
  return { data: data ?? [] };
}

/** Tambah satu atau banyak penerima sekaligus untuk satu jenis bantuan. */
export async function tambahPenerimaBantuan(prevState, formData) {
  const jenisId = formData.get("jenis_bantuan_id")?.toString();
  const periode = (formData.get("periode")?.toString() ?? "").trim();
  const keterangan = (formData.get("keterangan")?.toString() ?? "").trim();
  const tampil = formData.get("tampil_publik") === "on";

  let wargaIds = [];
  try {
    wargaIds = JSON.parse(formData.get("warga_ids")?.toString() || "[]");
  } catch {
    return { error: "Daftar penerima tidak valid. Pilih ulang namanya." };
  }

  if (!jenisId || !UUID_RE.test(jenisId)) {
    return { error: "Pilih jenis bantuan terlebih dahulu." };
  }
  if (!Array.isArray(wargaIds) || wargaIds.length === 0) {
    return { error: "Pilih minimal satu penerima dari data penduduk." };
  }
  wargaIds = [...new Set(wargaIds)];
  if (wargaIds.length > MAKS_WARGA_SEKALI_TAMBAH) {
    return { error: `Maksimal ${MAKS_WARGA_SEKALI_TAMBAH} penerima sekali tambah.` };
  }
  if (!wargaIds.every((id) => typeof id === "string" && UUID_RE.test(id))) {
    return { error: "Ada penerima yang tidak valid. Pilih ulang namanya." };
  }
  if (periode.length > 60) {
    return { error: "Periode maksimal 60 karakter (contoh: 2026 atau Tahap 1 2026)." };
  }
  if (keterangan.length > 500) {
    return { error: "Keterangan maksimal 500 karakter." };
  }

  const supabase = await createClient();
  const akses = await pastikanAdmin(supabase);
  if (akses.error) return { error: akses.error };

  const { data: profil } = await supabase
    .from("profiles")
    .select("nama")
    .eq("id", akses.user.id)
    .maybeSingle();

  // Pastikan jenis bantuannya ada & aktif.
  const { data: jenis } = await supabase
    .from("jenis_bantuan")
    .select("id, aktif")
    .eq("id", jenisId)
    .maybeSingle();
  if (!jenis || !jenis.aktif) {
    return { error: "Jenis bantuan tidak ditemukan atau sudah dinonaktifkan." };
  }

  // Hanya warga yang benar-benar ada & aktif yang dipakai.
  const { data: wargaValid, error: errWarga } = await supabase
    .from("warga")
    .select("id")
    .in("id", wargaIds)
    .eq("status_kependudukan", "aktif");
  if (errWarga) {
    console.error("tambahPenerimaBantuan cek warga gagal:", errWarga);
    return { error: "Gagal memeriksa data penduduk. Coba lagi." };
  }
  const idValid = (wargaValid ?? []).map((w) => w.id);
  if (idValid.length === 0) {
    return { error: "Penerima yang dipilih tidak ditemukan di data penduduk aktif." };
  }

  const baris = idValid.map((warga_id) => ({
    warga_id,
    jenis_bantuan_id: jenisId,
    periode,
    keterangan: keterangan || null,
    tampil_publik: tampil,
    dicatat_oleh: akses.user.id,
    dicatat_oleh_nama: profil?.nama ?? null,
  }));

  // ignoreDuplicates: orang yang sudah tercatat untuk bantuan+periode yang sama
  // dilewati (tidak ditimpa), dan hanya baris BARU yang dikembalikan.
  const { data: dimasukkan, error } = await supabase
    .from("penerima_bantuan")
    .upsert(baris, {
      onConflict: "warga_id,jenis_bantuan_id,periode",
      ignoreDuplicates: true,
    })
    .select("id");

  if (error) {
    console.error("tambahPenerimaBantuan gagal:", error);
    return { error: "Gagal menyimpan penerima bantuan. Coba lagi." };
  }

  const jumlahBaru = dimasukkan?.length ?? 0;
  const dilewati = wargaIds.length - jumlahBaru;

  segarkan();
  return { success: true, jumlahBaru, dilewati, kunci: Date.now() };
}

/** Tampilkan / sembunyikan satu penerima dari halaman cek warga. */
export async function ubahTampilPenerima(id, tampilBaru) {
  if (!id || !UUID_RE.test(String(id))) return { error: "ID tidak valid." };

  const supabase = await createClient();
  const akses = await pastikanAdmin(supabase);
  if (akses.error) return { error: akses.error };

  const { error } = await supabase
    .from("penerima_bantuan")
    .update({ tampil_publik: !!tampilBaru })
    .eq("id", id);

  if (error) {
    console.error("ubahTampilPenerima gagal:", error);
    return { error: "Gagal mengubah status tampil." };
  }
  segarkan();
  return { success: true };
}

/** Tampilkan / sembunyikan SEMUA penerima satu program (jenis + periode). */
export async function ubahTampilMassal(jenisId, periode, tampilBaru) {
  if (!jenisId || !UUID_RE.test(String(jenisId))) return { error: "Jenis bantuan tidak valid." };

  const supabase = await createClient();
  const akses = await pastikanAdmin(supabase);
  if (akses.error) return { error: akses.error };

  const { error } = await supabase
    .from("penerima_bantuan")
    .update({ tampil_publik: !!tampilBaru })
    .eq("jenis_bantuan_id", jenisId)
    .eq("periode", String(periode ?? ""));

  if (error) {
    console.error("ubahTampilMassal gagal:", error);
    return { error: "Gagal mengubah status tampil." };
  }
  segarkan();
  return { success: true };
}

export async function hapusPenerimaBantuan(prevState, formData) {
  const id = formData.get("id")?.toString();
  if (!id || !UUID_RE.test(id)) return { error: "ID penerima tidak valid." };

  const supabase = await createClient();
  const akses = await pastikanAdmin(supabase);
  if (akses.error) return { error: akses.error };

  const { error } = await supabase.from("penerima_bantuan").delete().eq("id", id);
  if (error) {
    console.error("hapusPenerimaBantuan gagal:", error);
    return { error: "Gagal menghapus penerima. Coba lagi." };
  }
  segarkan();
  return { success: true };
}

/* ---------------------------- Jenis bantuan ---------------------------- */

export async function buatJenisBantuan(prevState, formData) {
  const nama = (formData.get("nama")?.toString() ?? "").trim();
  const kategori = formData.get("kategori")?.toString() ?? "lainnya";
  const penyelenggara = (formData.get("penyelenggara")?.toString() ?? "").trim();
  const deskripsi = (formData.get("deskripsi")?.toString() ?? "").trim();

  if (nama.length < 3 || nama.length > 120) {
    return { error: "Nama bantuan wajib diisi (3-120 karakter)." };
  }
  if (!KATEGORI_BANTUAN.some((k) => k.nilai === kategori)) {
    return { error: "Kategori tidak valid." };
  }
  if (penyelenggara.length > 120 || deskripsi.length > 500) {
    return { error: "Penyelenggara maksimal 120 karakter dan deskripsi maksimal 500 karakter." };
  }

  const supabase = await createClient();
  const akses = await pastikanAdmin(supabase);
  if (akses.error) return { error: akses.error };

  const { error } = await supabase.from("jenis_bantuan").insert({
    nama,
    kategori,
    penyelenggara: penyelenggara || null,
    deskripsi: deskripsi || null,
    urutan: 200, // jenis buatan admin ditaruh setelah daftar bawaan
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Jenis bantuan dengan nama itu sudah ada." };
    }
    console.error("buatJenisBantuan gagal:", error);
    return { error: "Gagal menyimpan jenis bantuan. Coba lagi." };
  }

  revalidatePath("/dashboard/bantuan/jenis");
  revalidatePath("/dashboard/bantuan/tambah");
  return { success: true, kunci: Date.now() };
}

export async function ubahAktifJenisBantuan(id, aktifBaru) {
  if (!id || !UUID_RE.test(String(id))) return { error: "ID tidak valid." };

  const supabase = await createClient();
  const akses = await pastikanAdmin(supabase);
  if (akses.error) return { error: akses.error };

  const { error } = await supabase
    .from("jenis_bantuan")
    .update({ aktif: !!aktifBaru })
    .eq("id", id);

  if (error) {
    console.error("ubahAktifJenisBantuan gagal:", error);
    return { error: "Gagal mengubah status jenis bantuan." };
  }
  revalidatePath("/dashboard/bantuan/jenis");
  revalidatePath("/dashboard/bantuan/tambah");
  segarkan();
  return { success: true };
}
