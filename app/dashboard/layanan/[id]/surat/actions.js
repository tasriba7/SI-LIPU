"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { pastikanBisaTerbitkanSurat } from "@/lib/akses";

const BATAS = { nomor: 100, teks: 4000, label: 120 };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

function bersih(v, maks) {
  return String(v ?? "").replace(/\r\n/g, "\n").trim().slice(0, maks);
}

// Dua sumber pengajuan: tabel generik baru (Form Builder) dan tabel lama.
const SUMBER = {
  layanan: {
    tabel: "pengajuan_layanan",
    kolom: "pengajuan_id",
    kolomPilih: "id, status, anonim, catatan_admin",
    path: "/dashboard/layanan",
  },
  lama: {
    tabel: "pengajuan_surat",
    kolom: "pengajuan_surat_id",
    kolomPilih: "id, status, catatan_admin",
    path: "/dashboard/surat",
  },
};

/** Nomor berikutnya (tanpa memakainya) untuk petunjuk di editor. */
export async function intipNomor({ templateId, tanggal }) {
  if (!templateId || !/^\d{4}-\d{2}-\d{2}$/.test(String(tanggal ?? ""))) return { nomor: null };
  const supabase = await createClient();
  const akses = await pastikanBisaTerbitkanSurat(supabase);
  if (akses.error) return { nomor: null };
  const { data } = await supabase.rpc("intip_nomor_surat", {
    p_template_id: templateId,
    p_tanggal: tanggal,
  });
  return { nomor: data || null };
}

/**
 * Cari penduduk AKTIF yang meninggal untuk dihubungkan ke Surat Keterangan
 * Kematian (nama atau NIK, minimal 3 huruf). Hanya untuk penerbit surat;
 * hasil mengikuti RLS tabel `warga`.
 */
export async function cariAlmarhum(kata) {
  const q = String(kata ?? "").trim().replace(/[,()%*\\]/g, " ").slice(0, 60);
  if (q.length < 3) return { hasil: [] };

  const supabase = await createClient();
  const akses = await pastikanBisaTerbitkanSurat(supabase);
  if (akses.error) return { error: akses.error, hasil: [] };

  const { data, error } = await supabase
    .from("warga")
    .select(
      "id, nik, no_kk, nama_lengkap, jenis_kelamin, tempat_lahir, tanggal_lahir, agama, alamat, dusun, rt, rw, status_dalam_kk"
    )
    .eq("status_kependudukan", "aktif")
    .or(`nama_lengkap.ilike.%${q}%,nik.ilike.%${q}%`)
    .order("nama_lengkap")
    .limit(8);

  if (error) return { error: "Gagal mencari data penduduk. Coba lagi.", hasil: [] };
  return { hasil: data ?? [] };
}

/**
 * Simpan salinan final surat + tandai pengajuan selesai.
 * Server memeriksa ulang SEMUA masukan (jangan percaya klien) dan role
 * penerbit; RLS di surat_terbit adalah lapisan kedua.
 * Nomor kosong + template punya format nomor => nomor diambil otomatis.
 */
export async function terbitkanSurat(payload) {
  const sumber = payload?.sumber === "lama" ? SUMBER.lama : SUMBER.layanan;
  const pengajuanId = String(payload?.pengajuanId ?? "");
  const nomor = bersih(payload?.nomorSurat, BATAS.nomor);
  const tanggal = String(payload?.tanggalSurat ?? "").slice(0, 10);
  const templateId = payload?.templateId ? String(payload.templateId) : null;
  const draf = payload?.draf;
  const ttd = payload?.penandatangan;

  if (!pengajuanId) return { error: "Pengajuan tidak ditemukan." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return { error: "Tanggal surat tidak valid." };
  if (!nomor && !templateId) return { error: "Nomor surat wajib diisi." };
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
    // Hanya penanda; gambarnya sendiri diambil dari bucket privat saat ditampilkan.
    tampil_ttd: payload?.tampilTtd === true,
    tampil_stempel: payload?.tampilStempel === true,
    kota: bersih(payload?.kota, BATAS.label),
  };
  if (!isi.judul) return { error: "Judul surat kosong." };

  const supabase = await createClient();
  const akses = await pastikanBisaTerbitkanSurat(supabase);
  if (akses.error) return { error: akses.error };

  const { data: pengajuan } = await supabase
    .from(sumber.tabel)
    .select(sumber.kolomPilih)
    .eq("id", pengajuanId)
    .maybeSingle();
  if (!pengajuan) return { error: "Pengajuan tidak ditemukan." };
  if (pengajuan.anonim) return { error: "Pengajuan anonim tidak bisa dibuatkan surat." };
  if (pengajuan.status === "ditolak") {
    return { error: "Pengajuan ini berstatus ditolak. Ubah statusnya dulu sebelum membuat surat." };
  }

  const simpan = (nomorFinal) =>
    supabase.from("surat_terbit").upsert(
      {
        [sumber.kolom]: pengajuanId,
        template_id: templateId,
        nomor_surat: nomorFinal,
        tanggal_surat: tanggal,
        isi,
        diterbitkan_oleh: akses.user.id,
      },
      { onConflict: sumber.kolom }
    );

  let nomorFinal = nomor;
  let error = null;

  if (nomorFinal) {
    ({ error } = await simpan(nomorFinal));
  } else {
    // Penomoran otomatis. Ulangi bila nomor kebetulan sudah dipakai surat yang
    // nomornya diketik manual (maks. 5 kali).
    for (let i = 0; i < 5; i++) {
      const { data, error: errNomor } = await supabase.rpc("ambil_nomor_surat", {
        p_template_id: templateId,
        p_tanggal: tanggal,
      });
      if (errNomor || !data) {
        return {
          error:
            "Nomor otomatis tidak tersedia (format nomor template belum diisi). Ketik nomor surat secara manual.",
        };
      }
      nomorFinal = data;
      ({ error } = await simpan(nomorFinal));
      if (!error || error.code !== "23505") break;
    }
  }

  if (error) {
    if (error.code === "23505") {
      return { error: `Nomor surat "${nomorFinal}" sudah dipakai surat lain. Gunakan nomor berbeda.` };
    }
    return { error: "Gagal menyimpan surat. Coba lagi." };
  }

  // Status otomatis "selesai" (catatan lama dipertahankan kalau sudah diisi).
  await supabase
    .from(sumber.tabel)
    .update({
      status: "selesai",
      diproses_oleh: akses.user.id,
      catatan_admin:
        pengajuan.catatan_admin ||
        "Surat sudah selesai dibuat. Silakan ambil di kantor desa pada jam kerja.",
    })
    .eq("id", pengajuanId);

  // ---- Surat Keterangan Kematian: hubungkan ke data penduduk ----------------
  // Dijalankan SETELAH surat tersimpan. Kalau gagal, surat tetap tersimpan dan
  // petugas diberi peringatan (bukan membatalkan surat yang sudah jadi).
  let mutasi = null;
  let peringatan = null;
  const minta = payload?.mutasi;
  if (minta && sumber === SUMBER.layanan) {
    const wargaId = String(minta.wargaId ?? "");
    const tglMeninggal = String(minta.tanggalMeninggal ?? "").slice(0, 10);

    const { data: tpl } = templateId
      ? await supabase.from("template_surat").select("kode").eq("id", templateId).maybeSingle()
      : { data: null };
    const { data: terbit } = await supabase
      .from("surat_terbit")
      .select("id")
      .eq(sumber.kolom, pengajuanId)
      .maybeSingle();

    if (!UUID.test(wargaId) || !ISO_TANGGAL.test(tglMeninggal)) {
      peringatan = "Penduduk atau tanggal meninggal tidak valid, jadi status penduduk belum diubah.";
    } else if (tpl?.kode !== "kematian") {
      peringatan = "Status meninggal hanya bisa diubah dari Surat Keterangan Kematian.";
    } else if (!terbit?.id) {
      peringatan = "Surat tersimpan, tetapi status penduduk belum bisa diubah. Simpan ulang surat ini.";
    } else {
      const { data: hasil, error: errMutasi } = await supabase.rpc("tandai_meninggal", {
        p_warga_id: wargaId,
        p_tanggal: tglMeninggal,
        p_surat_terbit_id: terbit.id,
        p_keterangan: `Surat Keterangan Kematian No. ${nomorFinal}`.slice(0, 300),
      });
      if (errMutasi) {
        peringatan =
          errMutasi.code === "P0001"
            ? `Surat tersimpan, tetapi status penduduk belum diubah: ${errMutasi.message}`
            : "Surat tersimpan, tetapi status penduduk belum bisa diubah. Pastikan migrasi 0032 sudah dijalankan di Supabase.";
      } else {
        mutasi = {
          nama: hasil?.nama || "",
          tanggal: tglMeninggal,
          diperbarui: !!hasil?.diperbarui,
          kepalaKeluarga: !!hasil?.kepala_keluarga,
          sisaAnggota: Number(hasil?.sisa_anggota) || 0,
        };
        revalidatePath("/dashboard");
        revalidatePath("/dashboard/kependudukan");
        revalidatePath("/dashboard/kependudukan/mutasi");
        revalidatePath("/");
      }
    }
  }

  revalidatePath(sumber.path);
  revalidatePath(`${sumber.path}/${pengajuanId}`);
  revalidatePath(`${sumber.path}/${pengajuanId}/surat`);
  revalidatePath("/dashboard/surat-terbit");
  return { success: true, nomor: nomorFinal, mutasi, peringatan };
}
