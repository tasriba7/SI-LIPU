"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { pastikanAdmin } from "@/lib/akses";
import { bisaTerbitkanSurat } from "@/lib/roles";
import { ambilDaftarDusun, periksaDusun } from "@/lib/wilayah";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;
const PESAN_AKSES_MUTASI =
  "Pencatatan mutasi hanya bisa dilakukan oleh Administrator, Sekretaris Desa, Kaur, atau Kasi.";

function hariIniISO() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function bersih(v, maks) {
  return String(v ?? "").replace(/\s+/g, " ").trim().slice(0, maks);
}

function segarkanHalaman() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/kependudukan");
  revalidatePath("/dashboard/kependudukan/kartu-keluarga");
  revalidatePath("/dashboard/kependudukan/mutasi");
  revalidatePath("/dashboard/kependudukan/mutasi/ringkasan");
  revalidatePath("/");
}

// Peran yang boleh mencatat mutasi = peran yang boleh menerbitkan surat
// (sama dengan akses_tulis_penuh() di database). Lapis kedua ada di fungsi SQL.
async function pastikanBisaCatatMutasi(supabase) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Anda harus login." };
  const { data: profil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!bisaTerbitkanSurat(profil?.role)) return { error: PESAN_AKSES_MUTASI };
  return { ok: true, user, role: profil.role };
}

function pesanGalat(error, cadangan) {
  if (error?.code === "P0001") return error.message;
  if (error?.code === "23505") return "NIK ini sudah terdaftar di data kependudukan.";
  return cadangan;
}

/**
 * Cari penduduk untuk dicatat mutasinya (nama atau NIK, minimal 3 huruf).
 * status "aktif"  -> calon yang pindah keluar
 * status "pindah" -> calon yang datang kembali
 */
export async function cariPendudukUntukMutasi(kata, status) {
  const q = String(kata ?? "").trim().replace(/[,()%*\\]/g, " ").slice(0, 60);
  if (q.length < 3) return { hasil: [] };
  const statusCari = status === "pindah" ? "pindah" : "aktif";

  const supabase = await createClient();
  const akses = await pastikanBisaCatatMutasi(supabase);
  if (akses.error) return { error: akses.error, hasil: [] };

  const { data, error } = await supabase
    .from("warga")
    .select(
      "id, nik, no_kk, nama_lengkap, jenis_kelamin, tanggal_lahir, dusun, rt, rw, status_dalam_kk, tanggal_status"
    )
    .eq("status_kependudukan", statusCari)
    .or(`nama_lengkap.ilike.%${q}%,nik.ilike.%${q}%`)
    .order("nama_lengkap")
    .limit(8);

  if (error) return { error: "Gagal mencari data penduduk. Coba lagi.", hasil: [] };
  return { hasil: data ?? [] };
}

/** Anggota AKTIF dalam satu No. KK (untuk memilih siapa saja yang ikut pindah). */
export async function ambilAnggotaKeluarga(noKk) {
  const kk = String(noKk ?? "").trim();
  if (!/^\d{16}$/.test(kk)) return { anggota: [] };

  const supabase = await createClient();
  const akses = await pastikanBisaCatatMutasi(supabase);
  if (akses.error) return { error: akses.error, anggota: [] };

  const { data, error } = await supabase
    .from("warga")
    .select("id, nik, nama_lengkap, tanggal_lahir, status_dalam_kk")
    .eq("no_kk", kk)
    .eq("status_kependudukan", "aktif")
    .order("tanggal_lahir")
    .limit(30);
  if (error) return { error: "Gagal memuat anggota keluarga.", anggota: [] };

  const anggota = (data ?? []).sort(
    (a, b) =>
      Number(b.status_dalam_kk === "Kepala Keluarga") -
      Number(a.status_dalam_kk === "Kepala Keluarga")
  );
  return { anggota };
}

/** Catat satu atau beberapa penduduk pindah keluar desa. */
export async function catatPindahKeluar(payload) {
  const ids = [...new Set((Array.isArray(payload?.wargaIds) ? payload.wargaIds : []).map(String))];
  const tanggal = String(payload?.tanggal ?? "").slice(0, 10);
  const tujuan = bersih(payload?.tujuan, 200);
  const keterangan = bersih(payload?.keterangan, 300);

  if (ids.length === 0) return { error: "Pilih minimal 1 penduduk yang pindah." };
  if (ids.length > 20) return { error: "Maksimal 20 orang per pencatatan." };
  if (!ids.every((i) => UUID.test(i))) return { error: "Data penduduk tidak valid." };
  if (!ISO_TANGGAL.test(tanggal)) return { error: "Tanggal pindah wajib diisi." };
  if (tanggal > hariIniISO()) return { error: "Tanggal pindah tidak boleh di masa depan." };
  if (!tujuan) return { error: "Tujuan pindah (daerah/alamat) wajib diisi." };

  const supabase = await createClient();
  const akses = await pastikanBisaCatatMutasi(supabase);
  if (akses.error) return { error: akses.error };

  const { data, error } = await supabase.rpc("catat_pindah_keluar", {
    p_warga_ids: ids,
    p_tanggal: tanggal,
    p_tujuan: tujuan,
    p_keterangan: keterangan || null,
  });
  if (error) {
    return {
      error: pesanGalat(
        error,
        "Gagal mencatat pindah keluar. Pastikan migrasi 0033 sudah dijalankan di Supabase, lalu coba lagi."
      ),
    };
  }

  segarkanHalaman();
  return {
    success: true,
    jumlah: Number(data?.jumlah) || ids.length,
    nama: Array.isArray(data?.nama) ? data.nama : [],
    kepalaKeluarga: !!data?.kepala_keluarga,
    sisaAnggota: Number(data?.sisa_anggota) || 0,
  };
}

/**
 * Catat penduduk datang. Tiap anggota:
 *   { wargaId }  -> penduduk lama (status pindah) datang kembali
 *   { nik, nama_lengkap, tanggal_lahir, ... } -> penduduk baru
 * Semua disimpan dalam SATU transaksi database: gagal satu = gagal semua.
 */
export async function catatDatang(payload) {
  const tanggal = String(payload?.tanggal ?? "").slice(0, 10);
  const asal = bersih(payload?.asal, 200);
  const keterangan = bersih(payload?.keterangan, 300);
  const kel = payload?.keluarga || {};
  const noKk = String(kel.no_kk ?? "").trim();
  const mentah = Array.isArray(payload?.anggota) ? payload.anggota : [];

  if (!ISO_TANGGAL.test(tanggal)) return { error: "Tanggal datang wajib diisi." };
  if (tanggal > hariIniISO()) return { error: "Tanggal datang tidak boleh di masa depan." };
  if (!asal) return { error: "Daerah asal wajib diisi." };
  if (noKk && !/^\d{16}$/.test(noKk)) {
    return { error: "No. KK harus berupa 16 digit angka (atau kosongkan jika belum ada)." };
  }
  if (mentah.length === 0) return { error: "Minimal isi 1 penduduk yang datang." };
  if (mentah.length > 20) return { error: "Maksimal 20 orang per pencatatan." };

  const nikTerlihat = new Set();
  const idTerlihat = new Set();
  const anggota = [];
  for (let i = 0; i < mentah.length; i++) {
    const a = mentah[i] || {};
    const label = `Anggota ke-${i + 1}`;

    if (a.wargaId) {
      const id = String(a.wargaId);
      if (!UUID.test(id)) return { error: `${label}: data penduduk tidak valid.` };
      if (idTerlihat.has(id)) return { error: `${label}: penduduk yang sama dipilih dua kali.` };
      idTerlihat.add(id);
      anggota.push({ warga_id: id });
      continue;
    }

    const nik = String(a.nik ?? "").trim();
    const nama = String(a.nama_lengkap ?? "").trim();
    const lahir = String(a.tanggal_lahir ?? "").slice(0, 10);
    if (!nik || !nama || !lahir) {
      return { error: `${label}: NIK, nama lengkap, dan tanggal lahir wajib diisi.` };
    }
    if (!/^\d{16}$/.test(nik)) return { error: `${label}: NIK harus 16 digit angka.` };
    if (nikTerlihat.has(nik)) return { error: `${label}: NIK ${nik} dobel di form ini.` };
    nikTerlihat.add(nik);
    if (!ISO_TANGGAL.test(lahir) || Number.isNaN(Date.parse(lahir))) {
      return { error: `${label}: tanggal lahir tidak valid.` };
    }
    if (lahir > tanggal) {
      return { error: `${label}: tanggal lahir tidak boleh setelah tanggal datang.` };
    }
    const jk = String(a.jenis_kelamin ?? "");
    if (jk && jk !== "L" && jk !== "P") return { error: `${label}: jenis kelamin tidak valid.` };

    anggota.push({
      nik,
      nama_lengkap: nama,
      tempat_lahir: bersih(a.tempat_lahir, 100),
      tanggal_lahir: lahir,
      jenis_kelamin: jk,
      no_hp: bersih(a.no_hp, 30),
      status_kawin: bersih(a.status_kawin, 40),
      status_dalam_kk: bersih(a.status_dalam_kk, 40),
      pekerjaan: bersih(a.pekerjaan, 100),
      agama: bersih(a.agama, 40),
      pendidikan: bersih(a.pendidikan, 60),
    });
  }

  const supabase = await createClient();
  const akses = await pastikanBisaCatatMutasi(supabase);
  if (akses.error) return { error: akses.error };

  const cekDusun = periksaDusun(kel.dusun, await ambilDaftarDusun(supabase));
  if (cekDusun.error) return { error: cekDusun.error };

  const { data, error } = await supabase.rpc("catat_datang", {
    p_tanggal: tanggal,
    p_asal: asal,
    p_keterangan: keterangan || null,
    p_no_kk: noKk || null,
    p_alamat: bersih(kel.alamat, 300) || null,
    p_dusun: cekDusun.nilai,
    p_rt: bersih(kel.rt, 10) || null,
    p_rw: bersih(kel.rw, 10) || null,
    p_anggota: anggota,
  });
  if (error) {
    return {
      error: pesanGalat(
        error,
        "Gagal mencatat penduduk datang. Pastikan migrasi 0033 sudah dijalankan di Supabase, lalu coba lagi."
      ),
    };
  }

  segarkanHalaman();
  return {
    success: true,
    jumlah: Number(data?.jumlah) || anggota.length,
    baru: Number(data?.baru) || 0,
    kembali: Number(data?.kembali) || 0,
    nama: Array.isArray(data?.nama) ? data.nama : [],
  };
}

/**
 * Batalkan catatan mutasi (mis. salah memilih orang): status penduduk
 * dikembalikan sesuai jenis catatan. Catatannya TIDAK dihapus, hanya ditandai
 * dibatalkan beserta alasannya. Hanya Administrator.
 * Pemeriksaan sebenarnya ada di fungsi database batalkan_mutasi() (lapis kedua).
 */
export async function batalkanMutasi(mutasiId, alasan) {
  const id = String(mutasiId ?? "");
  const teks = String(alasan ?? "").trim().slice(0, 300);
  if (!UUID.test(id)) return { error: "Catatan mutasi tidak valid." };
  if (teks.length < 3) return { error: "Alasan pembatalan wajib diisi." };

  const supabase = await createClient();
  const akses = await pastikanAdmin(supabase);
  if (akses.error) return { error: akses.error };

  const { error } = await supabase.rpc("batalkan_mutasi", {
    p_mutasi_id: id,
    p_alasan: teks,
  });
  if (error) {
    return {
      error:
        error.code === "P0001"
          ? error.message
          : "Gagal membatalkan. Pastikan migrasi 0033 sudah dijalankan, lalu coba lagi.",
    };
  }

  segarkanHalaman();
  return { success: true };
}
