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
    pekerjaan,
    agama,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "NIK ini sudah terdaftar di data kependudukan." };
    }
    return { error: "Gagal menyimpan data warga. Coba lagi." };
  }

  revalidatePath("/dashboard/kependudukan");
  return { success: true };
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
      pekerjaan,
      agama,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { error: "NIK ini sudah dipakai warga lain." };
    }
    return { error: "Gagal menyimpan perubahan. Coba lagi." };
  }

  revalidatePath("/dashboard/kependudukan");
  revalidatePath(`/dashboard/kependudukan/${id}/edit`);
  return { success: true };
}
