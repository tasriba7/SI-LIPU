"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { pastikanAdmin, pastikanKelolaPilkades } from "@/lib/akses";
import { adalahUuid } from "@/lib/validasiPengajuan";
import { STATUS_VERIFIKASI } from "@/lib/pilkades";

// Semua action di sini memakai sesi login pemanggil (RLS tetap berlaku),
// bukan kunci service_role. Cek role di server + RLS di database.

export async function buatPeriode(formData) {
  const supabase = await createClient();
  const cek = await pastikanAdmin(supabase);
  if (cek.error) return;
  const nama = String(formData.get("nama") ?? "").trim();
  const tanggal = String(formData.get("tanggal_pemungutan") ?? "") || null;
  if (!nama) return;
  await supabase
    .from("pilkades_periode")
    .insert({ nama, tanggal_pemungutan: tanggal, dibuat_oleh: cek.user.id });
  revalidatePath("/dashboard/pilkades", "layout");
}

export async function aktifkanPeriode(formData) {
  const supabase = await createClient();
  const cek = await pastikanAdmin(supabase);
  if (cek.error) return;
  const id = String(formData.get("id") ?? "");
  if (!adalahUuid(id)) return;
  // nonaktifkan yang lain dulu (indeks unik: hanya satu yang aktif)
  await supabase.from("pilkades_periode").update({ aktif: false }).eq("aktif", true);
  await supabase.from("pilkades_periode").update({ aktif: true }).eq("id", id);
  revalidatePath("/dashboard/pilkades", "layout");
}

export async function ambilCalonPemilih(formData) {
  const supabase = await createClient();
  const cek = await pastikanKelolaPilkades(supabase);
  if (cek.error) return;
  const periodeId = String(formData.get("periode_id") ?? "");
  if (!adalahUuid(periodeId)) return;
  await supabase.rpc("pilkades_ambil_calon_pemilih", { p_periode: periodeId });
  revalidatePath("/dashboard/pilkades", "layout");
}

export async function simpanPemilih(formData) {
  const supabase = await createClient();
  const cek = await pastikanKelolaPilkades(supabase);
  if (cek.error) return;
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status_verifikasi") ?? "");
  const tpsRaw = String(formData.get("tps_id") ?? "");
  const catatan = String(formData.get("catatan") ?? "").trim().slice(0, 300) || null;
  if (!adalahUuid(id) || !(status in STATUS_VERIFIKASI)) return;
  const tps_id = adalahUuid(tpsRaw) ? tpsRaw : null;
  await supabase
    .from("pilkades_pemilih")
    .update({
      status_verifikasi: status,
      status_otomatis: false, // keputusan manual tidak ditimpa filter usia
      tps_id,
      catatan,
      diverifikasi_oleh: cek.user.id,
      diverifikasi_pada: new Date().toISOString(),
    })
    .eq("id", id);
  revalidatePath("/dashboard/pilkades", "layout");
}

export async function tambahTps(formData) {
  const supabase = await createClient();
  const cek = await pastikanKelolaPilkades(supabase);
  if (cek.error) return;
  const periodeId = String(formData.get("periode_id") ?? "");
  const nama = String(formData.get("nama") ?? "").trim();
  const lokasi = String(formData.get("lokasi") ?? "").trim() || null;
  if (!adalahUuid(periodeId) || !nama) return;
  await supabase.from("pilkades_tps").insert({ periode_id: periodeId, nama, lokasi });
  revalidatePath("/dashboard/pilkades", "layout");
}

export async function hapusTps(formData) {
  const supabase = await createClient();
  const cek = await pastikanKelolaPilkades(supabase);
  if (cek.error) return;
  const id = String(formData.get("id") ?? "");
  if (!adalahUuid(id)) return;
  await supabase.from("pilkades_tps").delete().eq("id", id);
  revalidatePath("/dashboard/pilkades", "layout");
}

/**
 * Tetapkan DPS/DPT: salin pemilih berstatus "memenuhi syarat" menjadi arsip
 * yang tidak bisa diubah. Dipakai lewat useActionState (mengembalikan {error}).
 */
export async function tetapkanDaftar(prevState, formData) {
  const supabase = await createClient();
  const cek = await pastikanKelolaPilkades(supabase);
  if (cek.error) return { error: cek.error };

  const periodeId = String(formData.get("periode_id") ?? "");
  const jenis = String(formData.get("jenis") ?? "");
  const tanggal = String(formData.get("tanggal_penetapan") ?? "");
  const nomor = String(formData.get("nomor_berita_acara") ?? "").trim().slice(0, 100);
  const catatan = String(formData.get("catatan") ?? "").trim().slice(0, 300);

  if (!adalahUuid(periodeId)) return { error: "Periode tidak valid." };
  if (jenis !== "DPS" && jenis !== "DPT") return { error: "Jenis daftar tidak valid." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return { error: "Tanggal penetapan wajib diisi." };
  if (formData.get("konfirmasi") !== "ya") {
    return { error: "Centang pernyataan bahwa daftar tidak bisa diubah setelah ditetapkan." };
  }

  const { data, error } = await supabase.rpc("pilkades_tetapkan_daftar", {
    p_periode: periodeId,
    p_jenis: jenis,
    p_tanggal: tanggal,
    p_nomor: nomor,
    p_catatan: catatan,
  });

  if (error || !data) {
    // Pesan dari fungsi database (P0001) sudah berbahasa Indonesia dan aman ditampilkan.
    const aman = error?.code === "P0001" ? error.message : null;
    return { error: aman ?? "Gagal menetapkan daftar. Pastikan migrasi 0052 sudah dijalankan." };
  }

  revalidatePath("/dashboard/pilkades", "layout");
  redirect(`/dashboard/pilkades/daftar/${data}`);
}

/**
 * Terapkan usia minimum ke calon pemilih. Hanya baris "belum diperiksa" atau
 * yang sebelumnya diisi otomatis yang berubah; keputusan manual tidak ditimpa.
 */
export async function terapkanFilterUsia(formData) {
  const supabase = await createClient();
  const cek = await pastikanKelolaPilkades(supabase);
  if (cek.error) return;
  const periodeId = String(formData.get("periode_id") ?? "");
  const usia = parseInt(String(formData.get("usia") ?? ""), 10);
  const kawin = formData.get("kawin") === "1";
  const tandai = formData.get("tandai") === "1";
  if (!adalahUuid(periodeId) || !Number.isInteger(usia) || usia < 0 || usia > 120) return;
  const { data, error } = await supabase.rpc("pilkades_terapkan_usia", {
    p_periode: periodeId,
    p_usia: usia,
    p_kawin: kawin,
    p_tandai_memenuhi: tandai,
  });
  revalidatePath("/dashboard/pilkades", "layout");
  const h = Array.isArray(data) ? data[0] : data;
  if (error || !h) redirect("/dashboard/pilkades/pemilih?filter=gagal");
  redirect(
    `/dashboard/pilkades/pemilih?filter=ok&m=${h.memenuhi}&t=${h.tidak_memenuhi}&b=${h.belum}`
  );
}
