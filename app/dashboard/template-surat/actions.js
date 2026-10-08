"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { pastikanAdmin } from "@/lib/akses";

const BATAS = { teks: 4000, label: 120, nilai: 500 };

function bersih(v, maks) {
  return String(v ?? "").replace(/\r\n/g, "\n").trim().slice(0, maks);
}

function bersihBiodata(daftar) {
  return (Array.isArray(daftar) ? daftar : [])
    .slice(0, 30)
    .map((b) => ({ label: bersih(b?.label, BATAS.label), value: bersih(b?.value, BATAS.nilai) }))
    .filter((b) => b.label);
}

/** Simpan perubahan redaksi template. Hanya Administrator. */
export async function simpanTemplate(payload) {
  const id = String(payload?.id ?? "");
  const nama = bersih(payload?.nama, BATAS.label);
  const judul = bersih(payload?.judul, BATAS.label);
  const pembuka = bersih(payload?.pembuka, BATAS.teks);
  if (!id) return { error: "Template tidak ditemukan." };
  if (!nama) return { error: "Nama template wajib diisi." };
  if (!judul) return { error: "Judul surat wajib diisi." };
  if (!pembuka) return { error: "Kalimat pembuka wajib diisi." };

  const kata_kunci = (Array.isArray(payload?.kataKunci) ? payload.kataKunci : [])
    .map((k) => bersih(k, 60).toLowerCase())
    .filter(Boolean)
    .slice(0, 20);

  const supabase = await createClient();
  const akses = await pastikanAdmin(supabase);
  if (akses.error) return { error: akses.error };

  const { error } = await supabase
    .from("template_surat")
    .update({
      nama,
      kata_kunci,
      judul_atas: bersih(payload?.judulAtas, BATAS.label),
      judul,
      pembuka,
      biodata: bersihBiodata(payload?.biodata),
      teks_tengah: bersih(payload?.teksTengah, BATAS.teks),
      biodata2: bersihBiodata(payload?.biodata2),
      isi: bersih(payload?.isi, BATAS.teks),
      penutup: bersih(payload?.penutup, BATAS.teks),
    })
    .eq("id", id);

  if (error) return { error: "Gagal menyimpan template. Coba lagi." };

  revalidatePath("/dashboard/template-surat");
  revalidatePath(`/dashboard/template-surat/${id}`);
  return { success: true };
}

export async function toggleAktifTemplate(id, aktifBaru) {
  const supabase = await createClient();
  const akses = await pastikanAdmin(supabase);
  if (akses.error) return { error: akses.error };

  const { error } = await supabase
    .from("template_surat")
    .update({ aktif: !!aktifBaru })
    .eq("id", String(id));
  if (error) return { error: "Gagal mengubah status." };

  revalidatePath("/dashboard/template-surat");
  return { success: true };
}
