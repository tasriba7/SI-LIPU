"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { pastikanAdmin, pastikanKelolaPilkades } from "@/lib/akses";
import { adalahUuid } from "@/lib/validasiPengajuan";
import { STATUS_VERIFIKASI, STATUS_CALON, JABATAN_PANITIA, ambilDaftarPemilih } from "@/lib/pilkades";

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

/**
 * Susunan panitia: ketua/sekretaris/bendahara (diganti bila sudah ada) dan anggota (ditambah).
 * Penulisan hanya lewat fungsi database (tercatat di Riwayat).
 */
export async function simpanPanitia(formData) {
  const supabase = await createClient();
  const cek = await pastikanKelolaPilkades(supabase);
  if (cek.error) return;
  const kembali = "/dashboard/pilkades/panitia";
  const periodeId = String(formData.get("periode_id") ?? "");
  const jabatan = String(formData.get("jabatan") ?? "");
  const nama = String(formData.get("nama") ?? "").trim().replace(/\s+/g, " ").slice(0, 100);
  if (!adalahUuid(periodeId) || !(jabatan in JABATAN_PANITIA)) redirect(`${kembali}?hasil=gagal`);
  if (nama.length < 3) redirect(`${kembali}?hasil=pendek&jabatan=${jabatan}`);

  const { error } = await supabase.rpc("pilkades_simpan_panitia", {
    p_periode: periodeId,
    p_jabatan: jabatan,
    p_nama: nama,
  });
  revalidatePath("/dashboard/pilkades", "layout");
  if (error) {
    // Pesan fungsi database (P0001) sudah berbahasa Indonesia dan aman ditampilkan.
    const pesan = error.code === "P0001" ? `&pesan=${encodeURIComponent(error.message)}` : "";
    redirect(`${kembali}?hasil=gagal${pesan}`);
  }
  redirect(`${kembali}?hasil=ok&jabatan=${jabatan}&nama=${encodeURIComponent(nama)}`);
}

export async function hapusPanitia(formData) {
  const supabase = await createClient();
  const cek = await pastikanKelolaPilkades(supabase);
  if (cek.error) return;
  const id = String(formData.get("id") ?? "");
  if (!adalahUuid(id)) return;
  const { error } = await supabase.rpc("pilkades_hapus_panitia", { p_id: id });
  revalidatePath("/dashboard/pilkades", "layout");
  redirect(`/dashboard/pilkades/panitia?hasil=${error ? "gagal" : "hapus"}`);
}

/* =====================================================================
 * CALON KEPALA DESA
 * Hanya panitia yang mengubah (RLS pilkades_calon_tulis, migrasi 0055).
 * ===================================================================== */

/** Tambah calon baru (tanpa id) atau ubah calon yang ada (dengan id). */
export async function simpanCalon(formData) {
  const supabase = await createClient();
  const cek = await pastikanKelolaPilkades(supabase);
  if (cek.error) return;
  const kembali = "/dashboard/pilkades/calon";

  const id = String(formData.get("id") ?? "");
  const periodeId = String(formData.get("periode_id") ?? "");
  const nama = String(formData.get("nama") ?? "").trim().replace(/\s+/g, " ").slice(0, 100);
  const status = String(formData.get("status") ?? "mendaftar");
  const alasan = String(formData.get("alasan") ?? "").trim().slice(0, 300) || null;
  const visiMisi = String(formData.get("visi_misi") ?? "").trim().slice(0, 2000) || null;
  const nomorMentah = String(formData.get("nomor_urut") ?? "").trim();
  const nomor = nomorMentah === "" ? null : parseInt(nomorMentah, 10);

  if (!adalahUuid(periodeId) || !(status in STATUS_CALON) || (id && !adalahUuid(id))) {
    redirect(`${kembali}?hasil=gagal`);
  }
  if (nama.length < 3) redirect(`${kembali}?hasil=nama`);
  if (nomor !== null && (!Number.isInteger(nomor) || nomor < 1 || nomor > 99)) redirect(`${kembali}?hasil=nomor`);
  if (status === "ditetapkan" && nomor === null) redirect(`${kembali}?hasil=perlu_nomor`);
  if (status === "tidak_lolos" && (!alasan || alasan.length < 5)) redirect(`${kembali}?hasil=perlu_alasan`);

  const data = { nama, status, nomor_urut: nomor, alasan, visi_misi: visiMisi };
  const { error } = id
    ? await supabase.from("pilkades_calon").update(data).eq("id", id).eq("periode_id", periodeId)
    : await supabase.from("pilkades_calon").insert({ ...data, periode_id: periodeId, created_by: cek.user.id });

  revalidatePath("/dashboard/pilkades", "layout");
  if (error) redirect(`${kembali}?hasil=${error.code === "23505" ? "nomor_kembar" : "gagal"}`);

  await supabase.rpc("pilkades_catat", {
    p_periode: periodeId,
    p_aksi: "ubah_calon",
    p_detail: `${id ? "Ubah" : "Tambah"}: ${nama} - ${STATUS_CALON[status]}${nomor !== null ? ` (no. urut ${nomor})` : ""}`,
  });
  redirect(`${kembali}?hasil=ok&nama=${encodeURIComponent(nama)}`);
}

/** Hapus calon. Calon yang sudah "Ditetapkan" dikunci: ubah statusnya dulu bila memang salah. */
export async function hapusCalon(formData) {
  const supabase = await createClient();
  const cek = await pastikanKelolaPilkades(supabase);
  if (cek.error) return;
  const kembali = "/dashboard/pilkades/calon";
  const id = String(formData.get("id") ?? "");
  if (!adalahUuid(id)) redirect(`${kembali}?hasil=gagal`);

  const { data: calon } = await supabase
    .from("pilkades_calon")
    .select("id, periode_id, nama, status")
    .eq("id", id)
    .maybeSingle();
  if (!calon) redirect(`${kembali}?hasil=gagal`);
  if (calon.status === "ditetapkan") redirect(`${kembali}?hasil=terkunci`);

  const { error } = await supabase.from("pilkades_calon").delete().eq("id", id);
  revalidatePath("/dashboard/pilkades", "layout");
  if (error) redirect(`${kembali}?hasil=gagal`);

  await supabase.rpc("pilkades_catat", {
    p_periode: calon.periode_id,
    p_aksi: "hapus_calon",
    p_detail: `${calon.nama} - ${STATUS_CALON[calon.status] ?? calon.status}`,
  });
  redirect(`${kembali}?hasil=hapus`);
}

/* =====================================================================
 * DAFTAR HADIR (hari pemungutan suara)
 * Mengacu ke DPT resmi terbaru; satu pemilih hanya bisa dicatat hadir sekali.
 * Pembatalan wajib alasan dan tercatat di Riwayat (fungsi database, migrasi 0055).
 * ===================================================================== */

/** Alamat kembali ke halaman hadir dengan saringan yang sama (hanya kunci yang dikenal). */
function alamatHadir(formData, tambahan = {}) {
  const p = new URLSearchParams();
  for (const k of ["cari", "tps", "tampil", "hal"]) {
    const v = String(formData.get(k) ?? "").slice(0, 100);
    if (v) p.set(k, v);
  }
  for (const [k, v] of Object.entries(tambahan)) p.set(k, String(v));
  return `/dashboard/pilkades/hadir?${p.toString()}`;
}

export async function catatHadir(formData) {
  const supabase = await createClient();
  const cek = await pastikanKelolaPilkades(supabase);
  if (cek.error) return;
  const periodeId = String(formData.get("periode_id") ?? "");
  const wargaId = String(formData.get("warga_id") ?? "");
  const nama = String(formData.get("nama") ?? "").slice(0, 100);
  if (!adalahUuid(periodeId) || !adalahUuid(wargaId)) redirect(alamatHadir(formData, { hasil: "gagal" }));

  const { error } = await supabase.rpc("pilkades_catat_hadir", { p_periode: periodeId, p_warga: wargaId });
  revalidatePath("/dashboard/pilkades", "layout");
  if (error) {
    // Pesan fungsi database (P0001) sudah berbahasa Indonesia dan aman ditampilkan.
    const pesan = error.code === "P0001" ? error.message : "Gagal mencatat. Silakan coba lagi.";
    redirect(alamatHadir(formData, { hasil: "gagal", pesan }));
  }
  redirect(alamatHadir(formData, { hasil: "ok", nama }));
}

export async function batalHadir(formData) {
  const supabase = await createClient();
  const cek = await pastikanKelolaPilkades(supabase);
  if (cek.error) return;
  const periodeId = String(formData.get("periode_id") ?? "");
  const wargaId = String(formData.get("warga_id") ?? "");
  const alasan = String(formData.get("alasan") ?? "").trim().slice(0, 300);
  if (!adalahUuid(periodeId) || !adalahUuid(wargaId)) redirect(alamatHadir(formData, { hasil: "gagal" }));
  if (alasan.length < 5) redirect(alamatHadir(formData, { hasil: "gagal", pesan: "Alasan pembatalan wajib diisi (minimal 5 huruf)." }));

  const { error } = await supabase.rpc("pilkades_batal_hadir", {
    p_periode: periodeId,
    p_warga: wargaId,
    p_alasan: alasan,
  });
  revalidatePath("/dashboard/pilkades", "layout");
  if (error) {
    const pesan = error.code === "P0001" ? error.message : "Gagal membatalkan. Silakan coba lagi.";
    redirect(alamatHadir(formData, { hasil: "gagal", pesan }));
  }
  redirect(alamatHadir(formData, { hasil: "batal" }));
}
