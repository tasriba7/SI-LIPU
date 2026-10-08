"use server";

import { createClient } from "@/lib/supabase/server";
import { cariWargaDenganRateLimit } from "@/lib/lookupWarga";
import { buatKodeTracking } from "@/lib/kodeTracking";

/**
 * Step 1 (opsional, tergantung butuh_lookup_warga jenis layanan): cari data
 * warga lewat NIK + Tanggal Lahir. Ikuti docs/SECURITY.md — jangan ubah pola
 * ini (dua faktor, tanpa autocomplete, pesan gagal digeneralisasi).
 */
export async function cariWargaUntukLayanan(prevState, formData) {
  const nik = formData.get("nik")?.trim();
  const tanggal_lahir = formData.get("tanggal_lahir");

  if (!nik || !tanggal_lahir) {
    return { error: "NIK dan tanggal lahir wajib diisi." };
  }
  if (!/^\d{16}$/.test(nik)) {
    return { error: "NIK harus berupa 16 digit angka." };
  }

  const hasil = await cariWargaDenganRateLimit(nik, tanggal_lahir);

  if (hasil.rateLimited) {
    return {
      error:
        "Terlalu banyak percobaan pencarian. Coba lagi dalam beberapa menit, atau isi data secara manual.",
    };
  }

  if (!hasil.found) {
    // Pesan SENGAJA digeneralisasi — jangan bilang NIK/tanggal lahir mana
    // yang salah (docs/SECURITY.md poin 5).
    return {
      notFound: true,
      message: "Data tidak ditemukan. Anda tetap bisa lanjut isi data manual di bawah.",
    };
  }

  return { found: true, data: hasil.data, nikDicoba: nik };
}

/**
 * Step 2: submit pengajuan layanan (generik, berlaku untuk semua jenis
 * layanan yang dibuat lewat Form Builder).
 */
export async function ajukanLayanan(prevState, formData) {
  const jenis_layanan_id = formData.get("jenis_layanan_id");
  const kode_prefix = formData.get("kode_prefix") || "PL";
  const anonim = formData.get("anonim") === "1";
  const keterangan = formData.get("keterangan")?.trim() || null;
  const data_tambahan_raw = formData.get("data_tambahan_json") || "{}";

  if (!jenis_layanan_id) {
    return { error: "Jenis layanan tidak valid." };
  }

  let data_tambahan = {};
  try {
    data_tambahan = JSON.parse(data_tambahan_raw);
  } catch {
    data_tambahan = {};
  }

  const supabase = await createClient();

  // Identitas pelapor. Kalau ANONIM: tidak ada satu pun data identitas yang
  // dibaca dari form maupun disimpan (nama, NIK, No. HP, tautan data warga).
  let nama_pemohon = null;
  let nik = null;
  let no_hp = null;
  let warga_id = null;

  if (anonim) {
    // Anonim hanya boleh untuk layanan kategori pengaduan — dicek di server,
    // bukan percaya tampilan form (dan dijaga lagi oleh trigger database).
    const { data: jenis } = await supabase
      .from("jenis_layanan_master")
      .select("kategori")
      .eq("id", jenis_layanan_id)
      .eq("aktif", true)
      .maybeSingle();

    if (jenis?.kategori !== "pengaduan") {
      return { error: "Mode anonim hanya tersedia untuk layanan pengaduan." };
    }
  } else {
    nama_pemohon = formData.get("nama_pemohon")?.trim();
    nik = formData.get("nik")?.trim();
    no_hp = formData.get("no_hp")?.trim();
    warga_id = formData.get("warga_id") || null;

    if (!nama_pemohon || !nik || !no_hp) {
      return { error: "Semua kolom wajib diisi." };
    }
    if (!/^\d{16}$/.test(nik)) {
      return { error: "NIK harus berupa 16 digit angka." };
    }
  }

  // Kode anonim lebih panjang (10 karakter) karena jadi satu-satunya kunci pelapor.
  const kode_tracking = buatKodeTracking(kode_prefix, anonim ? 10 : 6);

  const { error } = await supabase.from("pengajuan_layanan").insert({
    kode_tracking,
    jenis_layanan_id,
    warga_id,
    nama_pemohon,
    nik,
    no_hp,
    keterangan,
    data_tambahan,
    anonim,
  });

  if (error) {
    return {
      error: "Gagal mengirim pengajuan. Coba lagi sebentar, atau hubungi kantor desa.",
    };
  }

  return { success: true, kode_tracking, anonim };
}
