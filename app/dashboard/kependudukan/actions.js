"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function tambahWarga(prevState, formData) {
  const nik = formData.get("nik")?.trim();
  const no_kk = formData.get("no_kk")?.trim() || null;
  const nama_lengkap = formData.get("nama_lengkap")?.trim();
  const tempat_lahir = formData.get("tempat_lahir")?.trim() || null;
  const tanggal_lahir = formData.get("tanggal_lahir");
  const jenis_kelamin = formData.get("jenis_kelamin") || null;
  const alamat = formData.get("alamat")?.trim() || null;
  const dusun = formData.get("dusun")?.trim() || null;
  const rt = formData.get("rt")?.trim() || null;
  const rw = formData.get("rw")?.trim() || null;
  const no_hp = formData.get("no_hp")?.trim() || null;
  const status_kawin = formData.get("status_kawin") || null;
  const status_dalam_kk = formData.get("status_dalam_kk") || null;
  const pekerjaan = formData.get("pekerjaan")?.trim() || null;
  const agama = formData.get("agama") || null;

  if (!nik || !nama_lengkap || !tanggal_lahir) {
    return { error: "NIK, nama lengkap, dan tanggal lahir wajib diisi." };
  }
  if (!/^\d{16}$/.test(nik)) {
    return { error: "NIK harus berupa 16 digit angka." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("warga").insert({
    nik,
    no_kk,
    nama_lengkap,
    tempat_lahir,
    tanggal_lahir,
    jenis_kelamin,
    alamat,
    dusun,
    rt,
    rw,
    no_hp,
    status_kawin,
    status_dalam_kk,
    pekerjaan,
    agama,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "NIK ini sudah terdaftar di data kependudukan." };
    }
    if (error.code === "P0001") {
      return { error: error.message };
    }
    return { error: "Gagal menyimpan data warga. Coba lagi." };
  }

  revalidatePath("/dashboard/kependudukan");
  return { success: true };
}

// Simpan 1 keluarga sekaligus dalam 1 aksi: No. KK + alamat diisi sekali,
// lalu anggota (1 orang atau lebih) dikirim sebagai array JSON dari form
// client (lihat FormKeluargaWarga.jsx). Dikirim sebagai SATU bulk insert
// supaya atomik — kalau salah satu anggota gagal (mis. NIK dobel, atau 2
// orang ditandai Kepala Keluarga), SEMUA anggota di form ini ikut batal
// tersimpan, bukan tersimpan sebagian.
export async function tambahKeluargaWarga(prevState, formData) {
  const no_kk = formData.get("no_kk")?.trim() || null;
  const alamat = formData.get("alamat")?.trim() || null;
  const dusun = formData.get("dusun")?.trim() || null;
  const rt = formData.get("rt")?.trim() || null;
  const rw = formData.get("rw")?.trim() || null;

  if (no_kk && !/^\d{16}$/.test(no_kk)) {
    return { error: "No. KK harus berupa 16 digit angka (atau kosongkan jika belum ada)." };
  }

  let anggotaMentah;
  try {
    anggotaMentah = JSON.parse(formData.get("anggota") || "[]");
  } catch {
    return { error: "Data anggota tidak terbaca. Coba lagi." };
  }
  if (!Array.isArray(anggotaMentah) || anggotaMentah.length === 0) {
    return { error: "Minimal isi 1 anggota keluarga." };
  }
  if (anggotaMentah.length > 20) {
    return { error: "Maksimal 20 anggota per kali simpan." };
  }

  const nikTerlihat = new Set();
  const barisSiap = [];

  for (let i = 0; i < anggotaMentah.length; i++) {
    const a = anggotaMentah[i] || {};
    const label = `Anggota ke-${i + 1}`;
    const nik = String(a.nik ?? "").trim();
    const nama_lengkap = String(a.nama_lengkap ?? "").trim();
    const tanggal_lahir = a.tanggal_lahir || "";

    if (!nik || !nama_lengkap || !tanggal_lahir) {
      return { error: `${label}: NIK, nama lengkap, dan tanggal lahir wajib diisi.` };
    }
    if (!/^\d{16}$/.test(nik)) {
      return { error: `${label}: NIK harus 16 digit angka.` };
    }
    if (nikTerlihat.has(nik)) {
      return { error: `${label}: NIK ${nik} dobel di form ini.` };
    }
    nikTerlihat.add(nik);

    barisSiap.push({
      nik,
      no_kk,
      nama_lengkap,
      tempat_lahir: String(a.tempat_lahir ?? "").trim() || null,
      tanggal_lahir,
      jenis_kelamin: a.jenis_kelamin || null,
      alamat,
      dusun,
      rt,
      rw,
      no_hp: String(a.no_hp ?? "").trim() || null,
      status_kawin: a.status_kawin || null,
      status_dalam_kk: a.status_dalam_kk || null,
      pekerjaan: String(a.pekerjaan ?? "").trim() || null,
      agama: a.agama || null,
    });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("warga").insert(barisSiap);

  if (error) {
    if (error.code === "23505") {
      return { error: "Ada NIK yang sudah terdaftar sebelumnya di data kependudukan." };
    }
    if (error.code === "P0001") {
      return { error: error.message };
    }
    return { error: "Gagal menyimpan data keluarga. Coba lagi." };
  }

  revalidatePath("/dashboard/kependudukan");
  revalidatePath("/dashboard/kependudukan/kartu-keluarga");
  return { success: true, jumlah: barisSiap.length };
}

export async function editWarga(prevState, formData) {
  const id = formData.get("id");
  const nik = formData.get("nik")?.trim();
  const no_kk = formData.get("no_kk")?.trim() || null;
  const nama_lengkap = formData.get("nama_lengkap")?.trim();
  const tempat_lahir = formData.get("tempat_lahir")?.trim() || null;
  const tanggal_lahir = formData.get("tanggal_lahir");
  const jenis_kelamin = formData.get("jenis_kelamin") || null;
  const alamat = formData.get("alamat")?.trim() || null;
  const dusun = formData.get("dusun")?.trim() || null;
  const rt = formData.get("rt")?.trim() || null;
  const rw = formData.get("rw")?.trim() || null;
  const no_hp = formData.get("no_hp")?.trim() || null;
  const status_kawin = formData.get("status_kawin") || null;
  const status_dalam_kk = formData.get("status_dalam_kk") || null;
  const pekerjaan = formData.get("pekerjaan")?.trim() || null;
  const agama = formData.get("agama") || null;

  if (!id) {
    return { error: "Data warga tidak ditemukan." };
  }
  if (!nik || !nama_lengkap || !tanggal_lahir) {
    return { error: "NIK, nama lengkap, dan tanggal lahir wajib diisi." };
  }
  if (!/^\d{16}$/.test(nik)) {
    return { error: "NIK harus berupa 16 digit angka." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("warga")
    .update({
      nik,
      no_kk,
      nama_lengkap,
      tempat_lahir,
      tanggal_lahir,
      jenis_kelamin,
      alamat,
      dusun,
      rt,
      rw,
      no_hp,
      status_kawin,
      status_dalam_kk,
      pekerjaan,
      agama,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { error: "NIK ini sudah dipakai warga lain." };
    }
    if (error.code === "P0001") {
      return { error: error.message };
    }
    return { error: "Gagal menyimpan perubahan. Coba lagi." };
  }

  revalidatePath("/dashboard/kependudukan");
  revalidatePath(`/dashboard/kependudukan/${id}/edit`);
  return { success: true };
}

const KOLOM_WAJIB = ["nik", "nama_lengkap", "tanggal_lahir"];

function bersihkanBarisImport(raw, nomorBaris) {
  const ambil = (k) => {
    const v = raw?.[k];
    if (v === undefined || v === null) return null;
    const s = String(v).trim();
    return s === "" ? null : s;
  };

  const baris = {
    nik: ambil("nik"),
    no_kk: ambil("no_kk"),
    nama_lengkap: ambil("nama_lengkap"),
    tempat_lahir: ambil("tempat_lahir"),
    tanggal_lahir: ambil("tanggal_lahir"),
    jenis_kelamin: ambil("jenis_kelamin"),
    status_kawin: ambil("status_kawin"),
    status_dalam_kk: ambil("status_dalam_kk"),
    alamat: ambil("alamat"),
    dusun: ambil("dusun"),
    rt: ambil("rt"),
    rw: ambil("rw"),
    no_hp: ambil("no_hp"),
    pekerjaan: ambil("pekerjaan"),
    agama: ambil("agama"),
  };

  for (const kolom of KOLOM_WAJIB) {
    if (!baris[kolom]) {
      return { error: `Baris ${nomorBaris}: kolom "${kolom}" wajib diisi.` };
    }
  }
  if (!/^\d{16}$/.test(baris.nik)) {
    return { error: `Baris ${nomorBaris}: NIK "${baris.nik}" harus 16 digit angka.` };
  }
  if (Number.isNaN(Date.parse(baris.tanggal_lahir))) {
    return { error: `Baris ${nomorBaris}: tanggal lahir "${baris.tanggal_lahir}" tidak valid.` };
  }
  if (baris.jenis_kelamin && !["L", "P"].includes(baris.jenis_kelamin)) {
    return { error: `Baris ${nomorBaris}: jenis kelamin harus "L" atau "P".` };
  }

  return { data: baris };
}

export async function importWarga(prevState, formData) {
  let rows;
  try {
    rows = JSON.parse(formData.get("rows") || "[]");
  } catch {
    return { error: "Data impor tidak terbaca. Coba unggah ulang filenya." };
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return { error: "Tidak ada baris data yang bisa diimpor dari file ini." };
  }
  if (rows.length > 500) {
    return { error: "Maksimal 500 baris per proses impor. Bagi file jadi beberapa bagian." };
  }

  const supabase = await createClient();
  const gagal = [];
  let berhasil = 0;
  const nikTerlihat = new Set();

  for (let i = 0; i < rows.length; i++) {
    const nomorBaris = i + 2; // baris 1 = header di file Excel
    const hasilBersih = bersihkanBarisImport(rows[i], nomorBaris);
    if (hasilBersih.error) {
      gagal.push(hasilBersih.error);
      continue;
    }

    const baris = hasilBersih.data;
    if (nikTerlihat.has(baris.nik)) {
      gagal.push(`Baris ${nomorBaris}: NIK "${baris.nik}" duplikat di dalam file yang diunggah.`);
      continue;
    }
    nikTerlihat.add(baris.nik);

    const { error } = await supabase.from("warga").insert(baris);
    if (error) {
      if (error.code === "23505") {
        gagal.push(`Baris ${nomorBaris}: NIK "${baris.nik}" sudah terdaftar di data kependudukan.`);
      } else if (error.code === "P0001") {
        gagal.push(`Baris ${nomorBaris}: ${error.message}`);
      } else {
        gagal.push(`Baris ${nomorBaris}: gagal disimpan (${error.message}).`);
      }
      continue;
    }
    berhasil += 1;
  }

  revalidatePath("/dashboard/kependudukan");
  return {
    success: true,
    ringkasan: { total: rows.length, berhasil, gagal: gagal.length },
    daftarGagal: gagal,
  };
}

export async function hapusWarga(prevState, formData) {
  const id = formData.get("id");

  if (!id) {
    return { error: "Data warga tidak ditemukan." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("warga").delete().eq("id", id);

  if (error) {
    if (error.code === "23503") {
      return {
        error:
          "Data warga ini masih terkait dengan data lain (mis. pengajuan surat) dan tidak bisa dihapus.",
      };
    }
    return { error: "Gagal menghapus data warga. Coba lagi." };
  }

  revalidatePath("/dashboard/kependudukan");
  return { success: true };
}
