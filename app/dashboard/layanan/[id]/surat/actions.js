"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { pastikanBisaTerbitkanSurat } from "@/lib/akses";

const BATAS = { nomor: 100, teks: 4000, label: 120 };

function bersih(v, maks) {
  return String(v ?? "").replace(/\r\n/g, "\n").trim().slice(0, maks);
}

/**
 * Simpan salinan final surat + tandai pengajuan selesai.
 * Server memeriksa ulang SEMUA masukan (jangan percaya klien) dan role
 * penerbit; RLS di surat_terbit adalah lapisan kedua.
 */
export async function terbitkanSurat(payload) {
  const pengajuanId = String(payload?.pengajuanId ?? "");
  const nomor = bersih(payload?.nomorSurat, BATAS.nomor);
  const tanggal = String(payload?.tanggalSurat ?? "").slice(0, 10);
  const draf = payload?.draf;
  const ttd = payload?.penandatangan;

  if (!pengajuanId) return { error: "Pengajuan tidak ditemukan." };
  if (!nomor) return { error: "Nomor surat wajib diisi." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return { error: "Tanggal surat tidak valid." };
  if (!draf || typeof draf !== "object") return { error: "Isi surat kosong." };
  if (!ttd?.nama?.trim()) return { error: "Nama penandatangan wajib diisi." };

  const bersihBiodata = (daftar) =>
    (Array.isArray(daftar) ? daftar : []).slice(0, 30).map((b) => ({
      label: bersih(b?.label, BATAS.label),
      value: bersih(b?.value, 500),
    }));

  const isi = {
    judul_atas: bersih(draf.judul_atas, BATAS.label),
    judul: bersih(draf.judul, BATAS.label),
    pembuka: bersih(draf.pembuka, BATAS.teks),
    biodata: bersihBiodata(draf.biodata),
    teks_tengah: bersih(draf.teks_tengah, BATAS.teks),
    biodata2: bersihBiodata(draf.biodata2),
    isi: bersih(draf.isi, BATAS.teks),
    penutup: bersih(draf.penutup, BATAS.teks),
    penandatangan: {
      mode: ttd.mode === "sekdes" ? "sekdes" : "kades",
      jabatan_awal: bersih(ttd.jabatan_awal, BATAS.label),
      jabatan: bersih(ttd.jabatan, BATAS.label),
      nama: bersih(ttd.nama, BATAS.label),
      nip: bersih(ttd.nip, 40),
    },
    kota: bersih(payload?.kota, BATAS.label),
  };
  if (!isi.judul) return { error: "Judul surat kosong." };

  const supabase = await createClient();
  const akses = await pastikanBisaTerbitkanSurat(supabase);
  if (akses.error) return { error: akses.error };

  const { data: pengajuan } = await supabase
    .from("pengajuan_layanan")
    .select("id, status, anonim, catatan_admin")
    .eq("id", pengajuanId)
    .maybeSingle();
  if (!pengajuan) return { error: "Pengajuan tidak ditemukan." };
  if (pengajuan.anonim) return { error: "Pengajuan anonim tidak bisa dibuatkan surat." };
  if (pengajuan.status === "ditolak") {
    return { error: "Pengajuan ini berstatus ditolak. Ubah statusnya dulu sebelum membuat surat." };
  }

  const { error } = await supabase.from("surat_terbit").upsert(
    {
      pengajuan_id: pengajuanId,
      template_id: payload?.templateId || null,
      nomor_surat: nomor,
      tanggal_surat: tanggal,
      isi,
      diterbitkan_oleh: akses.user.id,
    },
    { onConflict: "pengajuan_id" }
  );

  if (error) {
    if (error.code === "23505") {
      return { error: `Nomor surat "${nomor}" sudah dipakai surat lain. Gunakan nomor berbeda.` };
    }
    return { error: "Gagal menyimpan surat. Coba lagi." };
  }

  // Status otomatis "selesai" (catatan lama dipertahankan kalau sudah diisi).
  await supabase
    .from("pengajuan_layanan")
    .update({
      status: "selesai",
      diproses_oleh: akses.user.id,
      catatan_admin:
        pengajuan.catatan_admin ||
        "Surat sudah selesai dibuat. Silakan ambil di kantor desa pada jam kerja.",
    })
    .eq("id", pengajuanId);

  revalidatePath("/dashboard/layanan");
  revalidatePath(`/dashboard/layanan/${pengajuanId}`);
  revalidatePath(`/dashboard/layanan/${pengajuanId}/surat`);
  return { success: true };
}
