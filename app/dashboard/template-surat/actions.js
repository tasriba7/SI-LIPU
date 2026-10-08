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
      format_nomor: bersih(payload?.formatNomor, BATAS.label),
      kelompok_nomor: bersih(payload?.kelompokNomor, 60).toLowerCase().replace(/[^a-z0-9_-]+/g, "_") || "umum",
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

/**
 * Buat template baru: kosong, atau salinan dari template yang sudah ada.
 * Setelah dibuat, admin menyunting isinya di halaman edit.
 */
export async function buatTemplate({ kode, nama, salinDariId }) {
  const kodeBersih = bersih(kode, 40).toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  const namaBersih = bersih(nama, BATAS.label);
  if (!kodeBersih) return { error: "Kode template wajib diisi (huruf kecil/angka, mis. kuasa_pengurusan)." };
  if (!namaBersih) return { error: "Nama template wajib diisi." };

  const supabase = await createClient();
  const akses = await pastikanAdmin(supabase);
  if (akses.error) return { error: akses.error };

  let dasar = {
    kata_kunci: [],
    judul_atas: "",
    judul: namaBersih.toUpperCase(),
    pembuka:
      "Yang bertanda tangan di bawah ini, Kepala {{jenis_wilayah}} {{nama_desa}} Kecamatan {{kecamatan}} Kabupaten {{kabupaten}}, menerangkan bahwa:",
    biodata: [
      { label: "Nama", value: "{{nama}}" },
      { label: "NIK", value: "{{nik}}" },
      { label: "Tempat/Tanggal Lahir", value: "{{ttl}}" },
      { label: "Alamat", value: "{{alamat}}" },
    ],
    teks_tengah: "",
    biodata2: [],
    isi: "",
    penutup:
      "Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.",
    format_nomor: "470/{urut3}/DS/{bulan_romawi}/{tahun}",
    kelompok_nomor: "umum",
  };

  if (salinDariId) {
    const { data: sumber } = await supabase
      .from("template_surat")
      .select("kata_kunci, judul_atas, judul, pembuka, biodata, teks_tengah, biodata2, isi, penutup, format_nomor, kelompok_nomor")
      .eq("id", String(salinDariId))
      .maybeSingle();
    if (!sumber) return { error: "Template sumber tidak ditemukan." };
    // Kata kunci tidak disalin supaya dua template tidak berebut layanan yang sama.
    dasar = { ...sumber, kata_kunci: [] };
  }

  const { data, error } = await supabase
    .from("template_surat")
    .insert({ kode: kodeBersih, nama: namaBersih, ...dasar })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { error: `Kode "${kodeBersih}" sudah dipakai template lain.` };
    return { error: "Gagal membuat template. Coba lagi." };
  }

  revalidatePath("/dashboard/template-surat");
  return { success: true, id: data.id };
}
