"use server";

import { revalidatePath } from "next/cache";
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
