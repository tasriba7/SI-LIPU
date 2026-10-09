"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { pastikanBisaTerbitkanSurat } from "@/lib/akses";
import { buatKodeTracking } from "@/lib/kodeTracking";

const ISO_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Cari data penduduk untuk dipilih petugas (nama atau NIK, minimal 3 huruf).
 * Hanya untuk staf penerbit surat. Hasil mengikuti RLS tabel `warga`, jadi
 * petugas hanya melihat wilayah yang memang boleh diaksesnya.
 */
export async function cariWargaStaf(kata) {
  // Buang karakter yang bisa merusak filter .or() PostgREST.
  const q = String(kata ?? "").trim().replace(/[,()%*\\]/g, " ").slice(0, 60);
  if (q.length < 3) return { hasil: [] };

  const supabase = await createClient();
  const akses = await pastikanBisaTerbitkanSurat(supabase);
  if (akses.error) return { error: akses.error, hasil: [] };

  const { data, error } = await supabase
    .from("warga")
    .select("id, nik, nama_lengkap, tanggal_lahir, dusun, rt, rw, no_hp")
    .eq("status_kependudukan", "aktif")
    .or(`nama_lengkap.ilike.%${q}%,nik.ilike.%${q}%`)
    .order("nama_lengkap")
    .limit(8);

  if (error) return { error: "Gagal mencari data penduduk. Coba lagi.", hasil: [] };
  return { hasil: data ?? [] };
}

/** Rapikan & periksa isian tambahan sesuai form_schema jenis layanan. */
function periksaDataTambahan(schema, mentah) {
  let obj = {};
  try {
    obj = JSON.parse(mentah || "{}");
  } catch {
    obj = {};
  }

  const hasil = {};
  for (const f of Array.isArray(schema) ? schema : []) {
    const v = String(obj?.[f.field_key] ?? "").trim().slice(0, 1000);
    if (!v) {
      if (f.wajib) return { error: `"${f.label}" wajib diisi.` };
      continue;
    }
    if (f.tipe === "pilihan" && !(f.opsi || []).includes(v)) {
      return { error: `Pilihan untuk "${f.label}" tidak valid.` };
    }
    if (f.tipe === "tanggal" && !ISO_TANGGAL.test(v)) {
      return { error: `Tanggal pada "${f.label}" tidak valid.` };
    }
    if (f.tipe === "angka" && !Number.isFinite(Number(v))) {
      return { error: `"${f.label}" harus berupa angka.` };
    }
    hasil[f.field_key] = v;
  }
  return { hasil };
}

/**
 * Petugas membuat surat LANGSUNG, tanpa menunggu ajuan warga.
 *
 * Identitas pemohon (nama, NIK, No. HP, tautan warga_id) SELALU diambil dari
 * tabel `warga` di server, bukan dari isian form, supaya datanya sama persis
 * dengan data kependudukan. Server membuat baris pengajuan_layanan berstatus
 * "diproses", lalu petugas diarahkan ke editor "Buat Surat" yang sudah ada
 * (nomor otomatis, tanda tangan, cetak, arsip Surat Terbit ikut dipakai).
 */
export async function buatSuratLangsung(prevState, formData) {
  const jenisId = String(formData.get("jenis_layanan_id") ?? "");
  const wargaId = String(formData.get("warga_id") ?? "");
  const keterangan = String(formData.get("keterangan") ?? "").trim().slice(0, 1000) || null;
  const noHpInput = String(formData.get("no_hp") ?? "").trim().slice(0, 30);

  if (!jenisId) return { error: "Pilih jenis surat terlebih dahulu." };
  if (!wargaId) return { error: "Pilih penduduk yang akan dibuatkan surat." };

  const supabase = await createClient();
  const akses = await pastikanBisaTerbitkanSurat(supabase);
  if (akses.error) return { error: akses.error };

  const { data: jenis } = await supabase
    .from("jenis_layanan_master")
    .select("id, kode_prefix, kategori, form_schema")
    .eq("id", jenisId)
    .maybeSingle();
  if (!jenis || jenis.kategori !== "surat") {
    return { error: "Jenis surat tidak valid." };
  }

  const { data: warga } = await supabase
    .from("warga")
    .select("id, nik, nama_lengkap, no_hp")
    .eq("id", wargaId)
    .eq("status_kependudukan", "aktif")
    .maybeSingle();
  if (!warga) return { error: "Data penduduk tidak ditemukan atau sudah tidak aktif." };

  const tambahan = periksaDataTambahan(jenis.form_schema, formData.get("data_tambahan_json"));
  if (tambahan.error) return { error: tambahan.error };

  // Database mewajibkan No. HP terisi untuk pengajuan non-anonim. Kalau warga
  // belum punya nomor dan petugas tidak mengisi, pakai tanda "-" (tombol
  // WhatsApp otomatis tidak muncul).
  const noHp = noHpInput || warga.no_hp || "-";

  let pengajuanId = null;
  for (let i = 0; i < 3; i++) {
    const { data, error } = await supabase
      .from("pengajuan_layanan")
      .insert({
        kode_tracking: buatKodeTracking(jenis.kode_prefix || "SRT"),
        jenis_layanan_id: jenis.id,
        warga_id: warga.id,
        nama_pemohon: warga.nama_lengkap,
        nik: warga.nik,
        no_hp: noHp,
        keterangan,
        data_tambahan: tambahan.hasil,
        status: "diproses",
        diproses_oleh: akses.user.id,
      })
      .select("id")
      .single();

    if (!error) {
      pengajuanId = data.id;
      break;
    }
    // 23505 = kode tracking kebetulan kembar -> buat kode baru lalu coba lagi.
    if (error.code !== "23505") {
      return { error: "Gagal membuat surat. Coba lagi sebentar." };
    }
  }
  if (!pengajuanId) return { error: "Gagal membuat surat. Coba lagi sebentar." };

  revalidatePath("/dashboard/layanan");
  // redirect() melempar sinyal khusus Next.js, jadi harus di luar try/catch.
  redirect(`/dashboard/layanan/${pengajuanId}/surat`);
}
