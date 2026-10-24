"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { pastikanAdmin, pastikanKelolaPilkades } from "@/lib/akses";
import { adalahUuid } from "@/lib/validasiPengajuan";
import { STATUS_VERIFIKASI, ambilDaftarPemilih } from "@/lib/pilkades";

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
  const { data, error } = await supabase.rpc("pilkades_ambil_calon_pemilih", { p_periode: periodeId });
  revalidatePath("/dashboard/pilkades", "layout");
  if (error) redirect("/dashboard/pilkades/ambil?hasil=gagal");
  const n = typeof data === "number" ? data : null;
  redirect(`/dashboard/pilkades/ambil?hasil=ok${n !== null ? `&n=${n}` : ""}`);
}

export async function simpanPemilih(formData) {
  const supabase = await createClient();
  const cek = await pastikanKelolaPilkades(supabase);
  if (cek.error) return;
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status_verifikasi") ?? "");
  const catatan = String(formData.get("catatan") ?? "").trim().slice(0, 300) || null;
  if (!adalahUuid(id) || !(status in STATUS_VERIFIKASI)) return;
  const perubahan = {
    status_verifikasi: status,
    status_otomatis: false, // keputusan manual tidak ditimpa filter usia
    catatan,
    diverifikasi_oleh: cek.user.id,
    diverifikasi_pada: new Date().toISOString(),
  };
  // TPS hanya diubah bila memang dikirim dari formulir (halaman "Periksa Pemilih" tidak mengirimnya).
  if (formData.has("tps_id")) {
    const tpsRaw = String(formData.get("tps_id") ?? "");
    perubahan.tps_id = adalahUuid(tpsRaw) ? tpsRaw : null;
  }
  await supabase.from("pilkades_pemilih").update(perubahan).eq("id", id);
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
  const { error } = await supabase.from("pilkades_tps").insert({ periode_id: periodeId, nama, lokasi });
  revalidatePath("/dashboard/pilkades", "layout");
  if (error) redirect(`/dashboard/pilkades/tps?hasil=${error.code === "23505" ? "kembar" : "gagal"}`);
  redirect(`/dashboard/pilkades/tps?hasil=ok&nama=${encodeURIComponent(nama)}`);
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
    `/dashboard/pilkades/pemilih?filter=ok&m=${h.memenuhi}&t=${h.tidak_memenuhi}&p=${h.perlu_dicek}&b=${h.belum}`
  );
}


/**
 * Tempatkan banyak pemilih ke satu TPS sekaligus.
 *  mode "terpilih" : daftar id dari kotak centang
 *  mode "semua"    : semua yang memenuhi syarat & BELUM punya TPS (boleh dibatasi satu dusun)
 */
export async function masukkanKeTps(formData) {
  const supabase = await createClient();
  const cek = await pastikanKelolaPilkades(supabase);
  if (cek.error) return;
  const kembali = "/dashboard/pilkades/tempatkan";
  const periodeId = String(formData.get("periode_id") ?? "");
  const tpsId = String(formData.get("tps_id") ?? "");
  const mode = String(formData.get("mode") ?? "terpilih");
  const dusun = String(formData.get("dusun") ?? "");
  if (!adalahUuid(periodeId) || !adalahUuid(tpsId)) redirect(`${kembali}?hasil=tps`);

  const { data: tps } = await supabase
    .from("pilkades_tps")
    .select("id, nama")
    .eq("id", tpsId)
    .eq("periode_id", periodeId)
    .maybeSingle();
  if (!tps) redirect(`${kembali}?hasil=tps`);

  let ids = [];
  if (mode === "semua") {
    const { data } = await ambilDaftarPemilih(supabase, periodeId);
    ids = (data ?? [])
      .filter((r) => r.status_verifikasi === "memenuhi_syarat" && !r.tps_id && (!dusun || r.dusun === dusun))
      .map((r) => r.id);
  } else {
    ids = formData.getAll("ids").map(String).filter(adalahUuid);
  }
  if (!ids.length) redirect(`${kembali}?hasil=kosong`);

  let jumlah = 0;
  let gagal = false;
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await supabase
      .from("pilkades_pemilih")
      .update({ tps_id: tpsId })
      .in("id", ids.slice(i, i + 100))
      .eq("periode_id", periodeId)
      .eq("status_verifikasi", "memenuhi_syarat")
      .select("id");
    if (error) { gagal = true; break; }
    jumlah += data?.length ?? 0;
  }
  revalidatePath("/dashboard/pilkades", "layout");
  if (gagal) redirect(`${kembali}?hasil=gagal`);
  redirect(`${kembali}?hasil=ok&n=${jumlah}&tps=${encodeURIComponent(tps.nama)}`);
}
