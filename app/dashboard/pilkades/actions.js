"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { pastikanAdmin, pastikanKelolaPilkades } from "@/lib/akses";
import { adalahUuid } from "@/lib/validasiPengajuan";
import {
  STATUS_VERIFIKASI, STATUS_CALON, JABATAN_PANITIA, ambilDaftarPemilih,
  BUCKET_LOGO_PILKADES, EKSTENSI_LOGO, MAKS_LOGO_MB, USIA_MINIMUM_PEMILIH, MAKS_CALON, MIN_CALON,
} from "@/lib/pilkades";
import { JENIS_OTOMATIS, MAKS_TAHAPAN } from "@/lib/pilkadesJadwal";
import { tundaSebelumJadwal } from "@/lib/pilkadesTanggal";

// Semua action di sini memakai sesi login pemanggil (RLS tetap berlaku),
// bukan kunci service_role. Cek role di server + RLS di database.

const ALAMAT_PERIODE = "/dashboard/pilkades/pengaturan/periode";

export async function buatPeriode(formData) {
  const supabase = await createClient();
  const cek = await pastikanAdmin(supabase);
  if (cek.error) redirect(`${ALAMAT_PERIODE}?hasil=izin`);
  const nama = String(formData.get("nama") ?? "").trim().replace(/\s+/g, " ").slice(0, 100);
  const tanggal = String(formData.get("tanggal_pemungutan") ?? "").trim() || null;
  if (nama.length < 3) redirect(`${ALAMAT_PERIODE}?hasil=nama`);
  if (tanggal && !(/^\d{4}-\d{2}-\d{2}$/.test(tanggal) && !Number.isNaN(Date.parse(`${tanggal}T00:00:00Z`)))) {
    redirect(`${ALAMAT_PERIODE}?hasil=tanggal`);
  }
  const { error } = await supabase
    .from("pilkades_periode")
    .insert({ nama, tanggal_pemungutan: tanggal, dibuat_oleh: cek.user.id });
  revalidatePath("/dashboard", "layout");
  if (error) redirect(`${ALAMAT_PERIODE}?hasil=gagal`);
  redirect(`${ALAMAT_PERIODE}?hasil=dibuat&nama=${encodeURIComponent(nama)}`);
}

/** Ubah tanggal pemungutan suara periode (hanya Administrator). Kosong = hapus tanggal. */
export async function ubahTanggalPemungutan(formData) {
  const supabase = await createClient();
  const cek = await pastikanAdmin(supabase);
  if (cek.error) redirect(`${ALAMAT_PERIODE}?hasil=izin`);
  const id = String(formData.get("id") ?? "");
  if (!adalahUuid(id)) redirect(`${ALAMAT_PERIODE}?hasil=gagal`);
  const t = String(formData.get("tanggal_pemungutan") ?? "").trim();
  if (t && !(/^\d{4}-\d{2}-\d{2}$/.test(t) && !Number.isNaN(Date.parse(`${t}T00:00:00Z`)))) {
    redirect(`${ALAMAT_PERIODE}?hasil=tanggal`);
  }
  const { data, error } = await supabase
    .from("pilkades_periode").update({ tanggal_pemungutan: t || null }).eq("id", id).select("id");
  revalidatePath("/dashboard", "layout");
  if (error || !data?.length) redirect(`${ALAMAT_PERIODE}?hasil=gagal`);
  redirect(`${ALAMAT_PERIODE}?hasil=${t ? "tanggal_ok" : "tanggal_hapus"}`);
}

/** Jadikan satu periode aktif (hanya Administrator). Lewat fungsi database supaya atomik. */
export async function aktifkanPeriode(formData) {
  const supabase = await createClient();
  const cek = await pastikanAdmin(supabase);
  if (cek.error) redirect(`${ALAMAT_PERIODE}?hasil=izin`);
  const id = String(formData.get("id") ?? "");
  if (!adalahUuid(id)) redirect(`${ALAMAT_PERIODE}?hasil=gagal`);
  const { error } = await supabase.rpc("pilkades_aktifkan_periode", { p_id: id });
  revalidatePath("/dashboard", "layout");
  if (error) {
    if (error.code === "PGRST202" || error.code === "42883") redirect(`${ALAMAT_PERIODE}?hasil=migrasi`);
    redirect(`${ALAMAT_PERIODE}?hasil=gagal`);
  }
  redirect(`${ALAMAT_PERIODE}?hasil=aktif`);
}

/** Animasi "Ambil Data Warga" tampil minimal sekian milidetik, walau datanya sedikit. */
const MIN_ANIMASI_AMBIL_MS = 5000;

export async function ambilCalonPemilih(formData) {
  const mulai = Date.now();
  try {
    await ambilCalonPemilihInti(formData);
  } finally {
    // finally tetap jalan saat redirect() melempar, jadi jeda berlaku di semua jalur.
    const sisa = MIN_ANIMASI_AMBIL_MS - (Date.now() - mulai);
    if (sisa > 0) await new Promise((r) => setTimeout(r, sisa));
  }
}

async function ambilCalonPemilihInti(formData) {
  const supabase = await createClient();
  const cek = await pastikanKelolaPilkades(supabase);
  if (cek.error) return;
  const periodeId = String(formData.get("periode_id") ?? "");
  if (!adalahUuid(periodeId)) return;
  const { data, error } = await supabase.rpc("pilkades_ambil_calon_pemilih", { p_periode: periodeId });
  revalidatePath("/dashboard/pilkades", "layout");
  if (error) redirect(`/dashboard/pilkades/ambil?hasil=${/terkunci|DPT sudah/i.test(error.message ?? "") ? "terkunci" : "gagal"}`);
  const n = typeof data === "number" ? data : null;
  // Sambungan data penduduk: tandai yang meninggal/pindah dan yang baru datang (<6 bulan).
  const { data: sk } = await supabase.rpc("pilkades_sinkron_penduduk", { p_periode: periodeId });
  const h = Array.isArray(sk) ? sk[0] : sk;
  const tambah = h ? `&ta=${h.tidak_aktif}&bd=${h.baru_datang}` : "";
  redirect(`/dashboard/pilkades/ambil?hasil=ok${n !== null ? `&n=${n}` : ""}${tambah}`);
}

/** Samakan daftar calon pemilih dengan data penduduk terbaru (tanpa mengambil warga baru). */
export async function sinkronPenduduk(formData) {
  const supabase = await createClient();
  const cek = await pastikanKelolaPilkades(supabase);
  if (cek.error) return;
  const periodeId = String(formData.get("periode_id") ?? "");
  if (!adalahUuid(periodeId)) return;
  const { data, error } = await supabase.rpc("pilkades_sinkron_penduduk", { p_periode: periodeId });
  revalidatePath("/dashboard/pilkades", "layout");
  const h = Array.isArray(data) ? data[0] : data;
  if (error || !h) redirect(`/dashboard/pilkades/ambil?hasil=${/terkunci|DPT sudah/i.test(error?.message ?? "") ? "terkunci" : "gagal"}`);
  redirect(`/dashboard/pilkades/ambil?hasil=sinkron&ta=${h.tidak_aktif}&bd=${h.baru_datang}`);
}

/* =====================================================================
 * PEMILIH TAMBAHAN (setelah DPT; DPT sendiri tidak diubah) — migrasi 0066
 * ===================================================================== */
const ALAMAT_TAMBAHAN = "/dashboard/pilkades/tambahan";

export async function tambahPemilihTambahan(formData) {
  const supabase = await createClient();
  const cek = await pastikanKelolaPilkades(supabase);
  if (cek.error) return;
  const periodeId = String(formData.get("periode_id") ?? "");
  const wargaId = String(formData.get("warga_id") ?? "");
  const tpsId = String(formData.get("tps_id") ?? "");
  const alasan = String(formData.get("alasan") ?? "").trim().slice(0, 300);
  if (!adalahUuid(periodeId) || !adalahUuid(wargaId) || !adalahUuid(tpsId)) redirect(`${ALAMAT_TAMBAHAN}?hasil=gagal`);
  if (alasan.length < 5) redirect(`${ALAMAT_TAMBAHAN}?hasil=gagal&pesan=${encodeURIComponent("Alasan wajib diisi (minimal 5 huruf).")}`);
  const { error } = await supabase.rpc("pilkades_tambah_pemilih", {
    p_periode: periodeId, p_warga: wargaId, p_tps: tpsId, p_alasan: alasan,
  });
  revalidatePath("/dashboard/pilkades", "layout");
  if (error) {
    const pesan = error.code === "P0001" ? error.message : "Gagal mencatat. Silakan coba lagi.";
    redirect(`${ALAMAT_TAMBAHAN}?hasil=gagal&pesan=${encodeURIComponent(pesan)}`);
  }
  redirect(`${ALAMAT_TAMBAHAN}?hasil=ok`);
}

export async function batalPemilihTambahan(formData) {
  const supabase = await createClient();
  const cek = await pastikanKelolaPilkades(supabase);
  if (cek.error) return;
  const id = String(formData.get("id") ?? "");
  const alasan = String(formData.get("alasan") ?? "").trim().slice(0, 300);
  if (!adalahUuid(id)) redirect(`${ALAMAT_TAMBAHAN}?hasil=gagal`);
  if (alasan.length < 5) redirect(`${ALAMAT_TAMBAHAN}?hasil=gagal&pesan=${encodeURIComponent("Alasan pembatalan wajib diisi (minimal 5 huruf).")}`);
  const { error } = await supabase.rpc("pilkades_batal_tambahan", { p_id: id, p_alasan: alasan });
  revalidatePath("/dashboard/pilkades", "layout");
  if (error) {
    const pesan = error.code === "P0001" ? error.message : "Gagal membatalkan. Silakan coba lagi.";
    redirect(`${ALAMAT_TAMBAHAN}?hasil=gagal&pesan=${encodeURIComponent(pesan)}`);
  }
  redirect(`${ALAMAT_TAMBAHAN}?hasil=batal`);
}

/**
 * Simpan status satu pemilih. Berhasil = halaman tampil ulang dengan status baru (tanpa pesan,
 * supaya menyimpan banyak baris tidak berisik). Gagal = kembali ke halaman yang SAMA (saringan dan
 * nomor halaman tetap) dengan pesan yang menjelaskan sebabnya.
 */
export async function simpanPemilih(formData) {
  const supabase = await createClient();
  const mentah = String(formData.get("kembali") ?? "");
  const dasar = mentah.startsWith("/dashboard/pilkades/pemilih?") ? mentah : "/dashboard/pilkades/pemilih?";
  const nama = String(formData.get("nama") ?? "").trim().slice(0, 100);
  const gagal = (kode) =>
    redirect(`${dasar}${dasar.endsWith("?") ? "" : "&"}simpan=${kode}${nama ? `&nama=${encodeURIComponent(nama)}` : ""}`);

  const cek = await pastikanKelolaPilkades(supabase);
  if (cek.error) gagal("izin");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status_verifikasi") ?? "");
  const catatan = String(formData.get("catatan") ?? "").trim().slice(0, 300) || null;
  if (!adalahUuid(id) || !(status in STATUS_VERIFIKASI)) gagal("gagal");
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
  const { data, error } = await supabase.from("pilkades_pemilih").update(perubahan).eq("id", id).select("id");
  revalidatePath("/dashboard/pilkades", "layout");
  if (error) gagal(error.code === "P0001" ? "terkunci" : "gagal");
  if (!data?.length) gagal("gagal");
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
  if (error) redirect(`/dashboard/pilkades/tps?hasil=${error.code === "23505" ? "kembar" : error.code === "P0001" ? "terkunci" : "gagal"}`);
  redirect(`/dashboard/pilkades/tps?hasil=ok&nama=${encodeURIComponent(nama)}`);
}

export async function hapusTps(formData) {
  const supabase = await createClient();
  const cek = await pastikanKelolaPilkades(supabase);
  if (cek.error) redirect("/dashboard/pilkades/tps?hasil=gagal");
  const id = String(formData.get("id") ?? "");
  if (!adalahUuid(id)) redirect("/dashboard/pilkades/tps?hasil=gagal");
  // Catat dulu nama TPS dan jumlah pemilihnya, supaya hasil penghapusan bisa dijelaskan.
  const { data: tps } = await supabase.from("pilkades_tps").select("nama").eq("id", id).maybeSingle();
  const { count } = await supabase
    .from("pilkades_pemilih").select("id", { count: "exact", head: true }).eq("tps_id", id);
  const { error } = await supabase.from("pilkades_tps").delete().eq("id", id);
  revalidatePath("/dashboard/pilkades", "layout");
  if (error) redirect(`/dashboard/pilkades/tps?hasil=${error.code === "P0001" ? "terkunci" : "gagal"}`);
  redirect(`/dashboard/pilkades/tps?hasil=hapus&n=${count ?? 0}&nama=${encodeURIComponent(tps?.nama ?? "")}`);
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

  // Penjaga tanggal: DPS/DPT baru bisa ditetapkan mulai tanggal tahapnya (Jadwal Tahapan).
  const tunda = await tundaSebelumJadwal(supabase, periodeId, jenis === "DPS" ? "dps" : "dpt");
  if (tunda) return { error: tunda.pesan };

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
    return { error: aman ?? "Gagal menetapkan daftar. Silakan coba lagi. Bila tetap gagal, hubungi Administrator desa." };
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
  const usia = USIA_MINIMUM_PEMILIH; // dikunci 17 tahun, nilai kiriman form diabaikan
  const kawin = formData.get("kawin") === "1";
  const tandai = formData.get("tandai") === "1";
  if (!adalahUuid(periodeId)) return;
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
  const kembali = "/dashboard/pilkades/pengaturan/panitia";
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
  redirect(`/dashboard/pilkades/pengaturan/panitia?hasil=${error ? "gagal" : "hapus"}`);
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
  if ((status === "tidak_lolos" || status === "gugur") && (!alasan || alasan.length < 5)) redirect(`${kembali}?hasil=perlu_alasan`);
  if (status === "ditetapkan") {
    // Calon ditetapkan paling banyak MAKS_CALON orang (database ikut menjaga).
    let q = supabase.from("pilkades_calon").select("id", { count: "exact", head: true })
      .eq("periode_id", periodeId).eq("status", "ditetapkan");
    if (id) q = q.neq("id", id);
    const { count } = await q;
    if ((count ?? 0) >= MAKS_CALON) redirect(`${kembali}?hasil=maks_calon`);

    // Penjaga tanggal: calon baru bisa DITETAPKAN mulai tanggal tahap "Penetapan Calon".
    // Calon yang sudah berstatus ditetapkan boleh disunting (mis. ganti nama) kapan saja.
    let sudahDitetapkan = false;
    if (id) {
      const { data: lama } = await supabase.from("pilkades_calon").select("status").eq("id", id).eq("periode_id", periodeId).maybeSingle();
      sudahDitetapkan = lama?.status === "ditetapkan";
    }
    if (!sudahDitetapkan) {
      const tunda = await tundaSebelumJadwal(supabase, periodeId, "calon");
      if (tunda) redirect(`${kembali}?hasil=belum_waktunya&pesan=${encodeURIComponent(tunda.pesan)}`);
    }
  }

  const data = { nama, status, nomor_urut: nomor, alasan, visi_misi: visiMisi };
  const { error } = id
    ? await supabase.from("pilkades_calon").update(data).eq("id", id).eq("periode_id", periodeId)
    : await supabase.from("pilkades_calon").insert({ ...data, periode_id: periodeId, created_by: cek.user.id });

  revalidatePath("/dashboard/pilkades", "layout");
  if (error) {
    const hasil = error.code === "23505" ? "nomor_kembar" : error.code === "P0001" ? (/paling banyak 5/.test(error.message) ? "maks_calon" : /Alasan wajib/.test(error.message) ? "perlu_alasan" : "terkunci_suara") : "gagal";
    redirect(`${kembali}?hasil=${hasil}`);
  }

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
  if (error) redirect(`${kembali}?hasil=${error.code === "23503" ? "terkunci_suara" : "gagal"}`);

  await supabase.rpc("pilkades_catat", {
    p_periode: calon.periode_id,
    p_aksi: "hapus_calon",
    p_detail: `${calon.nama} - ${STATUS_CALON[calon.status] ?? calon.status}`,
  });
  redirect(`${kembali}?hasil=hapus`);
}

/* =====================================================================
 * HASIL PEMUNGUTAN SUARA (tahap C)
 * Hanya angka hasil hitung per TPS; pilihan pemilih tidak direkam.
 * Penulisan hanya lewat fungsi database (migrasi 0060) dan tercatat di Riwayat.
 * ===================================================================== */

const ALAMAT_HASIL = "/dashboard/pilkades/hari-h/hasil";

/** Simpan rekap satu TPS: jumlah hadir, suara tiap calon (field "suara_<id calon>") + suara tidak sah. */
export async function simpanSuaraTps(formData) {
  const supabase = await createClient();
  const cek = await pastikanKelolaPilkades(supabase);
  if (cek.error) return;
  const periodeId = String(formData.get("periode_id") ?? "");
  const tpsId = String(formData.get("tps_id") ?? "");
  if (!adalahUuid(periodeId) || !adalahUuid(tpsId)) redirect(`${ALAMAT_HASIL}?hasil=gagal`);

  const angka = (v) => {
    const t = String(v ?? "").trim();
    return /^\d{1,6}$/.test(t) ? parseInt(t, 10) : null;
  };
  const suara = {};
  for (const [k, v] of formData.entries()) {
    if (!k.startsWith("suara_")) continue;
    const id = k.slice(6);
    if (!adalahUuid(id)) continue;
    const n = angka(v);
    if (n === null) redirect(`${ALAMAT_HASIL}?hasil=gagal&tps=${tpsId}&pesan=${encodeURIComponent("Isi suara dengan angka bulat 0 atau lebih. Isi 0 bila tidak ada.")}`);
    suara[id] = n;
  }
  const hadir = angka(formData.get("hadir"));
  if (hadir === null) redirect(`${ALAMAT_HASIL}?hasil=gagal&tps=${tpsId}&pesan=${encodeURIComponent("Isi jumlah pemilih yang hadir dengan angka bulat 0 atau lebih.")}`);
  const tidakSah = angka(formData.get("tidak_sah"));
  if (tidakSah === null) redirect(`${ALAMAT_HASIL}?hasil=gagal&tps=${tpsId}&pesan=${encodeURIComponent("Isi suara tidak sah dengan angka bulat 0 atau lebih.")}`);

  // Penjaga tanggal: rekap suara baru bisa dicatat mulai hari pemungutan (menu Periode).
  const tunda = await tundaSebelumJadwal(supabase, periodeId, "pemungutan");
  if (tunda) redirect(`${ALAMAT_HASIL}?hasil=gagal&tps=${tpsId}&pesan=${encodeURIComponent(tunda.pesan)}`);

  const { error } = await supabase.rpc("pilkades_simpan_suara", {
    p_periode: periodeId, p_tps: tpsId, p_suara: suara, p_tidak_sah: tidakSah, p_hadir: hadir,
  });
  revalidatePath("/dashboard/pilkades", "layout");
  if (error) {
    // Pesan fungsi database (P0001) sudah berbahasa Indonesia dan aman ditampilkan.
    const pesan = error.code === "P0001" ? error.message : "Gagal menyimpan. Silakan coba lagi. Bila tetap gagal, hubungi Administrator desa.";
    redirect(`${ALAMAT_HASIL}?hasil=gagal&tps=${tpsId}&pesan=${encodeURIComponent(pesan)}`);
  }
  redirect(`${ALAMAT_HASIL}?hasil=ok&tps=${tpsId}`);
}

/** Simpan suara calon yang SERI per dusun (Perbup Pasal 83). Kolom kosong = belum diisi. */
export async function simpanSuaraDusun(formData) {
  const supabase = await createClient();
  const cek = await pastikanKelolaPilkades(supabase);
  if (cek.error) return;
  const periodeId = String(formData.get("periode_id") ?? "");
  if (!adalahUuid(periodeId)) redirect(`${ALAMAT_HASIL}?hasil=gagal`);
  const data = {};
  for (const [k, v] of formData.entries()) {
    const m = /^sd_(\d+)_([0-9a-f-]{36})$/.exec(k);
    if (!m) continue;
    const teks = String(v ?? "").trim();
    if (teks === "") continue;
    if (!/^\d{1,6}$/.test(teks)) redirect(`${ALAMAT_HASIL}?hasil=gagal&pesan=${encodeURIComponent("Isi suara dengan angka bulat 0 atau lebih.")}`);
    const dusun = String(formData.get(`dusun_${m[1]}`) ?? "");
    if (!dusun) continue;
    (data[dusun] ??= {})[m[2]] = parseInt(teks, 10);
  }
  if (!Object.keys(data).length) redirect(`${ALAMAT_HASIL}?hasil=gagal&pesan=${encodeURIComponent("Isi minimal satu angka suara.")}`);
  const tunda = await tundaSebelumJadwal(supabase, periodeId, "pemungutan");
  if (tunda) redirect(`${ALAMAT_HASIL}?hasil=gagal&pesan=${encodeURIComponent(tunda.pesan)}`);
  const { error } = await supabase.rpc("pilkades_simpan_suara_dusun", { p_periode: periodeId, p_data: data });
  revalidatePath("/dashboard/pilkades", "layout");
  if (error) {
    const pesan = error.code === "P0001" ? error.message : "Gagal menyimpan. Silakan coba lagi. Bila tetap gagal, hubungi Administrator desa.";
    redirect(`${ALAMAT_HASIL}?hasil=gagal&pesan=${encodeURIComponent(pesan)}`);
  }
  redirect(`${ALAMAT_HASIL}?hasil=dusun`);
}

/** Tetapkan calon terpilih. Calon ditentukan database dari suara terbanyak (seri: lewat dusun). */
export async function tetapkanTerpilih(formData) {
  const supabase = await createClient();
  const cek = await pastikanKelolaPilkades(supabase);
  if (cek.error) return;
  const periodeId = String(formData.get("periode_id") ?? "");
  const tanggal = String(formData.get("tanggal_penetapan") ?? "");
  const nomor = String(formData.get("nomor_berita_acara") ?? "").trim().slice(0, 100);
  const catatan = String(formData.get("catatan") ?? "").trim().slice(0, 300);
  if (!adalahUuid(periodeId)) redirect(`${ALAMAT_HASIL}?hasil=gagal`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
    redirect(`${ALAMAT_HASIL}?hasil=gagal&pesan=${encodeURIComponent("Tanggal penetapan wajib diisi.")}`);
  }
  if (formData.get("konfirmasi") !== "ya") {
    redirect(`${ALAMAT_HASIL}?hasil=gagal&pesan=${encodeURIComponent("Centang pernyataan bahwa rekap suara sudah diperiksa.")}`);
  }
  const { count: jumlahCalon } = await supabase.from("pilkades_calon").select("id", { count: "exact", head: true })
    .eq("periode_id", periodeId).eq("status", "ditetapkan");
  if ((jumlahCalon ?? 0) < MIN_CALON) {
    redirect(`${ALAMAT_HASIL}?hasil=gagal&pesan=${encodeURIComponent("Calon terpilih baru bisa ditetapkan bila ada paling sedikit 2 calon yang ditetapkan. Hubungi Panitia Kabupaten bila calon tinggal satu.")}`);
  }
  // Penjaga tanggal: calon terpilih baru bisa ditetapkan mulai tanggal tahap "Penetapan Calon Terpilih".
  const tunda = await tundaSebelumJadwal(supabase, periodeId, "hasil");
  if (tunda) redirect(`${ALAMAT_HASIL}?hasil=gagal&pesan=${encodeURIComponent(tunda.pesan)}`);

  const { error } = await supabase.rpc("pilkades_tetapkan_terpilih", {
    p_periode: periodeId, p_tanggal: tanggal, p_nomor: nomor, p_catatan: catatan,
  });
  revalidatePath("/dashboard/pilkades", "layout");
  if (error) {
    const pesan = error.code === "P0001" ? error.message : "Gagal menetapkan. Silakan coba lagi. Bila tetap gagal, hubungi Administrator desa.";
    redirect(`${ALAMAT_HASIL}?hasil=gagal&pesan=${encodeURIComponent(pesan)}`);
  }
  redirect(`${ALAMAT_HASIL}?hasil=terpilih`);
}

/** Koreksi teknis: BUKAN wewenang panitia. Hanya Administrator (dijaga juga di database, 0065). */
export async function batalkanPenetapan(formData) {
  const supabase = await createClient();
  const cek = await pastikanAdmin(supabase);
  if (cek.error) return;
  const periodeId = String(formData.get("periode_id") ?? "");
  const alasan = String(formData.get("alasan") ?? "").trim().slice(0, 300);
  if (!adalahUuid(periodeId)) redirect(`${ALAMAT_HASIL}?hasil=gagal`);
  if (alasan.length < 5) {
    redirect(`${ALAMAT_HASIL}?hasil=gagal&pesan=${encodeURIComponent("Alasan pembatalan wajib diisi (minimal 5 huruf).")}`);
  }
  const { error } = await supabase.rpc("pilkades_batalkan_penetapan", { p_periode: periodeId, p_alasan: alasan });
  revalidatePath("/dashboard/pilkades", "layout");
  if (error) {
    const pesan = error.code === "P0001" ? error.message : "Gagal membatalkan. Silakan coba lagi.";
    redirect(`${ALAMAT_HASIL}?hasil=gagal&pesan=${encodeURIComponent(pesan)}`);
  }
  redirect(`${ALAMAT_HASIL}?hasil=batal`);
}

/* =====================================================================
 * LOGO PANITIA (migrasi 0061) — hanya panitia; admin hanya melihat.
 * ===================================================================== */

export async function simpanLogoPanitia(formData) {
  const supabase = await createClient();
  const cek = await pastikanKelolaPilkades(supabase);
  if (cek.error) return;
  const kembali = "/dashboard/pilkades/pengaturan/logo";
  const periodeId = String(formData.get("periode_id") ?? "");
  if (!adalahUuid(periodeId)) redirect(`${kembali}?hasil=gagal`);

  const { data: lama } = await supabase.from("pilkades_logo").select("logo_path").eq("periode_id", periodeId).maybeSingle();

  // Hapus logo
  if (formData.get("hapus") === "1") {
    if (!lama) redirect(`${kembali}?hasil=kosong`);
    const { error } = await supabase.rpc("pilkades_simpan_logo", { p_periode: periodeId, p_path: null });
    if (error) redirect(`${kembali}?hasil=gagal`);
    await supabase.storage.from(BUCKET_LOGO_PILKADES).remove([lama.logo_path]);
    revalidatePath("/dashboard/pilkades", "layout");
    redirect(`${kembali}?hasil=hapus`);
  }

  // Unggah / ganti logo
  const file = formData.get("logo");
  if (!file || typeof file !== "object" || !file.size) redirect(`${kembali}?hasil=kosong`);
  const ekstensi = (file.name?.split(".").pop() || "").toLowerCase();
  if (!EKSTENSI_LOGO.includes(ekstensi)) redirect(`${kembali}?hasil=format`);
  if (file.size > MAKS_LOGO_MB * 1024 * 1024) redirect(`${kembali}?hasil=besar`);

  const path = `${periodeId}/logo-${Date.now()}.${ekstensi}`;
  const { error: errUnggah } = await supabase.storage
    .from(BUCKET_LOGO_PILKADES)
    .upload(path, file, { contentType: file.type || undefined });
  if (errUnggah) redirect(`${kembali}?hasil=gagal`);

  const { error } = await supabase.rpc("pilkades_simpan_logo", { p_periode: periodeId, p_path: path });
  if (error) {
    await supabase.storage.from(BUCKET_LOGO_PILKADES).remove([path]); // jangan tinggalkan berkas yatim
    redirect(`${kembali}?hasil=gagal`);
  }
  if (lama?.logo_path) await supabase.storage.from(BUCKET_LOGO_PILKADES).remove([lama.logo_path]);
  revalidatePath("/dashboard/pilkades", "layout");
  redirect(`${kembali}?hasil=ok`);
}

/* =====================================================================
 * JADWAL TAHAPAN (migrasi 0062) — hanya panitia; admin hanya melihat.
 * Dipakai formulir klien lewat useActionState: galat dikembalikan sebagai
 * { error } supaya isian tidak hilang; berhasil -> kembali ke halaman jadwal.
 * ===================================================================== */

export async function simpanJadwal(_state, formData) {
  const supabase = await createClient();
  const cek = await pastikanKelolaPilkades(supabase);
  if (cek.error) return { error: "Hanya Panitia Pilkades yang dapat mengubah jadwal." };
  const periodeId = String(formData.get("periode_id") ?? "");
  if (!adalahUuid(periodeId)) return { error: "Periode tidak dikenali. Muat ulang halaman ini." };

  let mentah;
  try {
    mentah = JSON.parse(String(formData.get("data") ?? "[]"));
  } catch {
    return { error: "Data jadwal tidak terbaca. Muat ulang halaman ini lalu coba lagi." };
  }
  if (!Array.isArray(mentah)) return { error: "Data jadwal tidak valid." };
  if (mentah.length > MAKS_TAHAPAN) return { error: `Maksimal ${MAKS_TAHAPAN} tahapan.` };

  const tanggal = (v) => {
    const t = String(v ?? "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(t) && !Number.isNaN(Date.parse(`${t}T00:00:00Z`)) ? t : "";
  };
  const dipakai = new Set();
  const data = [];
  for (let i = 0; i < mentah.length; i++) {
    const r = mentah[i] ?? {};
    const nama = String(r.nama ?? "").trim().slice(0, 80);
    if (nama.length < 3) return { error: `Tahap nomor ${i + 1}: tulis nama tahapan (minimal 3 huruf), atau hapus tahap ini.` };
    const jenis = JENIS_OTOMATIS.includes(r.jenis) ? r.jenis : "";
    if (jenis) {
      if (dipakai.has(jenis)) return { error: "Ada tahap otomatis yang dobel. Muat ulang halaman ini lalu coba lagi." };
      dipakai.add(jenis);
    }
    const mulai = jenis === "pemungutan" ? "" : tanggal(r.mulai);
    const selesai = jenis === "pemungutan" ? "" : tanggal(r.selesai);
    if (selesai && !mulai) return { error: `“${nama}”: isi tanggal mulai dulu, atau kosongkan tanggal selesainya.` };
    if (selesai && selesai < mulai) return { error: `“${nama}”: tanggal selesai tidak boleh lebih awal dari tanggal mulai.` };
    data.push({
      jenis,
      nama,
      arti: String(r.arti ?? "").trim().slice(0, 200),
      mulai,
      selesai,
      catatan: String(r.catatan ?? "").trim().slice(0, 200),
    });
  }

  const { error } = await supabase.rpc("pilkades_simpan_jadwal", { p_periode: periodeId, p_data: data });
  if (error) {
    return { error: error.code === "P0001" ? error.message : "Jadwal gagal disimpan. Silakan coba lagi. Bila tetap gagal, hubungi Administrator desa." };
  }
  revalidatePath("/dashboard/pilkades", "layout");
  redirect(`/dashboard/pilkades/jadwal?hasil=ok&n=${data.length}`);
}

/**
 * RESET TAHAPAN (dua mode, keduanya langsung TERSIMPAN):
 *  - mode "pilihan": tahapan yang dicentang dikosongkan tanggal mulai, tanggal selesai, dan catatannya.
 *    Nama dan urutan tahapan tidak berubah. Tahap "Pemungutan" tidak punya tanggal sendiri
 *    (mengikuti menu Periode) sehingga tidak bisa direset di sini. Hanya jadwal yang berubah.
 *  - mode "semua": BERSIHKAN SEMUA data periode (perlu ketik RESET) lewat fungsi database
 *    pilkades_reset_bersih (migrasi 0068 + 0069): pemilih, TPS, arsip DPS/DPT, pemilih tambahan, daftar hadir,
 *    calon, rekap suara, hasil, susunan panitia, logo, dan jadwal. dan Riwayat
 *    Aktivitas periode itu (migrasi 0069). Periode dan data warga tetap ada. Satu transaksi: gagal berarti
 *    tidak ada yang terhapus.
 */
export async function resetTahapan(_state, formData) {
  const supabase = await createClient();
  const cek = await pastikanKelolaPilkades(supabase);
  if (cek.error) return { error: "Hanya Panitia Pilkades yang dapat mereset tahapan." };
  const periodeId = String(formData.get("periode_id") ?? "");
  if (!adalahUuid(periodeId)) return { error: "Periode tidak dikenali. Muat ulang halaman ini." };
  const mode = String(formData.get("mode") ?? "");

  if (mode === "semua") {
    if (String(formData.get("konfirmasi") ?? "") !== "RESET") {
      return { error: "Ketik RESET (huruf besar) pada kotak konfirmasi untuk mereset semua tahapan." };
    }
    // Catat lokasi berkas logo dulu: setelah baris datanya terhapus, jalurnya tidak bisa dicari lagi.
    const { data: logo } = await supabase
      .from("pilkades_logo").select("logo_path").eq("periode_id", periodeId).maybeSingle();
    const { error: errReset } = await supabase.rpc("pilkades_reset_bersih", { p_periode: periodeId });
    if (errReset) {
      if (errReset.code === "P0001") return { error: errReset.message };
      if (errReset.code === "PGRST202" || errReset.code === "42883") {
        return { error: "Fitur reset total belum dipasang di database. Jalankan migrasi 0068_pilkades_reset_bersih.sql dan 0069_pilkades_reset_riwayat.sql di Supabase SQL Editor, lalu coba lagi." };
      }
      return { error: "Reset gagal dan tidak ada data yang berubah. Silakan coba lagi. Bila tetap gagal, hubungi Administrator desa." };
    }
    if (logo?.logo_path) await supabase.storage.from(BUCKET_LOGO_PILKADES).remove([logo.logo_path]);
    // Menu samping (gembok tahapan) ada di layout /dashboard, jadi segarkan dari sana.
    revalidatePath("/dashboard", "layout");
    redirect("/dashboard/pilkades/jadwal?hasil=reset&mode=semua");
  }

  let data;
  if (mode === "pilihan") {
    const { data: baris, error: errBaca } = await supabase
      .from("pilkades_jadwal")
      .select("jenis, nama, arti, mulai, selesai, catatan")
      .eq("periode_id", periodeId)
      .order("urutan");
    if (errBaca) return { error: "Jadwal gagal dibaca. Muat ulang halaman ini lalu coba lagi." };
    if (!baris || baris.length === 0) {
      return { error: "Belum ada jadwal yang tersimpan, jadi belum ada yang perlu direset." };
    }
    if (Number(formData.get("jumlah")) !== baris.length) {
      return { error: "Daftar tahapan sudah berubah. Muat ulang halaman ini lalu coba lagi." };
    }
    const dipilih = new Set(
      formData.getAll("pilih").map((v) => Number(v)).filter((n) => Number.isInteger(n) && n >= 0 && n < baris.length),
    );
    if (dipilih.size === 0) return { error: "Centang dulu tahapan yang ingin direset." };
    data = baris.map((r, i) => {
      const reset = dipilih.has(i) && r.jenis !== "pemungutan";
      return {
        jenis: r.jenis ?? "",
        nama: r.nama,
        arti: r.arti ?? "",
        mulai: reset ? "" : (r.mulai ?? ""),
        selesai: reset ? "" : (r.selesai ?? ""),
        catatan: reset ? "" : (r.catatan ?? ""),
      };
    });
  } else {
    return { error: "Pilihan reset tidak dikenali. Muat ulang halaman ini." };
  }

  const { error } = await supabase.rpc("pilkades_simpan_jadwal", { p_periode: periodeId, p_data: data });
  if (error) {
    return { error: error.code === "P0001" ? error.message : "Tahapan gagal direset. Silakan coba lagi. Bila tetap gagal, hubungi Administrator desa." };
  }
  revalidatePath("/dashboard/pilkades", "layout");
  redirect(`/dashboard/pilkades/jadwal?hasil=reset&mode=${mode}`);
}
