"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { ambilIdentifier } from "@/lib/lookupWarga";
import { BAGIAN_DATA, PESAN_MIN, PESAN_MAKS } from "@/lib/laporanData";
import {
  mulaiVerifikasiTempatLahir,
  periksaPilihanTempatLahir,
} from "@/lib/verifikasiTempatLahir";

const PESAN_TIDAK_DITEMUKAN =
  "Data tidak ditemukan. Pastikan NIK dan tanggal lahir yang Anda masukkan benar. Jika yakin sudah benar, hubungi kantor desa.";

const BATAS_GAGAL = 5;
const JENDELA_MENIT = 15;

/**
 * Cek dua faktor (NIK 16 digit + tanggal lahir) dan batas percobaan.
 * Mengembalikan { error } kalau input tidak valid atau kena rate limit,
 * atau { nik, tanggal, identifier, supabase } kalau boleh lanjut.
 *
 * Gagal-tertutup: kalau batas percobaan tidak bisa dicek, permintaan ditolak.
 */
async function siapkanPencarian(formData) {
  const nik = String(formData.get("nik") ?? "").trim();
  const tanggal = String(formData.get("tanggal_lahir") ?? "").trim();

  if (!nik || !tanggal) return { error: "NIK dan tanggal lahir wajib diisi." };
  if (!/^\d{16}$/.test(nik)) return { error: "NIK harus berupa 16 digit angka." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return { error: "Tanggal lahir tidak valid." };

  const identifier = await ambilIdentifier();
  const supabase = createAdminClient();

  const { data: jumlahGagal, error: errHitung } = await supabase.rpc("hitung_percobaan_gagal", {
    p_identifier: identifier,
    p_menit: JENDELA_MENIT,
  });
  if (errHitung || jumlahGagal >= BATAS_GAGAL) {
    return { error: "Terlalu banyak percobaan. Coba lagi dalam beberapa menit." };
  }

  return { nik, tanggal, identifier, supabase };
}

async function ambilDataSaya(s) {
  const { data, error } = await s.supabase
    .rpc("data_warga_publik", {
      p_nik: s.nik,
      p_tanggal_lahir: s.tanggal,
      p_identifier: s.identifier,
    })
    .maybeSingle();

  if (error) return { error: "Data belum bisa dimuat. Coba lagi nanti." };
  if (!data) return { kosong: true, pesan: PESAN_TIDAK_DITEMUKAN };
  return { data };
}

/**
 * Warga melihat data kependudukannya sendiri: NIK + tanggal lahir, lalu tebak
 * tempat lahir (tiga faktor). Pesan "tidak ditemukan" SAMA untuk NIK salah,
 * tanggal lahir salah, maupun penduduk yang tidak aktif — tidak ada petunjuk
 * mana yang keliru.
 *
 * Langkah 1 (fungsi ini) TIDAK mengirim data apa pun; data baru keluar setelah
 * pilihan tempat lahir benar (periksaTempatLahirDataSaya). Salah 3 kali ->
 * pencarian dibatalkan dan warga itu dikunci 24 jam.
 */
export async function cariDataSaya(prevState, formData) {
  const s = await siapkanPencarian(formData);
  if (s.error) return { error: s.error };

  // Cek dua faktor dulu (juga dicatat di log percobaan), tapi jangan kirim datanya.
  const hasil = await ambilDataSaya(s);
  if (!hasil.data) return hasil;

  const { data: w } = await s.supabase
    .from("warga")
    .select("id")
    .eq("nik", s.nik)
    .maybeSingle();
  if (!w) return { kosong: true, pesan: PESAN_TIDAK_DITEMUKAN };

  const tl = await mulaiVerifikasiTempatLahir(s.supabase, w.id, s.nik);
  if (tl.batal) return { error: tl.pesan };
  if (!tl.lewati) {
    return {
      verifikasi: { opsi: tl.opsi, tiket: tl.tiket, sisa: tl.sisa },
      nik: s.nik,
      tanggal: s.tanggal,
    };
  }

  // Tempat lahir belum terisi di data kependudukan -> tidak bisa ditanyakan,
  // data tetap ditampilkan (warga bisa melaporkan kekurangannya lewat form).
  return hasil;
}

/** Langkah 2: pilihan tempat lahir benar -> kirim data. Salah 3 kali -> { batal, pesan }. */
export async function periksaTempatLahirDataSaya(nik, tanggal, tiket, pilihan) {
  const fd = new FormData();
  fd.set("nik", String(nik ?? ""));
  fd.set("tanggal_lahir", String(tanggal ?? ""));
  const s = await siapkanPencarian(fd);
  if (s.error) return { error: s.error };

  const r = await periksaPilihanTempatLahir(s.supabase, s.nik, tiket, pilihan);
  if (!r.ok) return r;

  const hasil = await ambilDataSaya(s);
  return hasil.data ? { ok: true, data: hasil.data } : hasil;
}

/**
 * Warga mengirim laporan "data saya keliru/kurang" ke admin.
 * Dua faktor diperiksa ULANG di database, jadi tidak bisa melapor atas nama
 * NIK orang lain. Isian bagian data dibatasi daftar BAGIAN_DATA.
 */
export async function kirimLaporanData(prevState, formData) {
  const pesan = String(formData.get("pesan") ?? "").trim();
  const bagian = String(formData.get("bagian") ?? "").trim();
  const noHp = String(formData.get("no_hp") ?? "").trim();

  if (pesan.length < PESAN_MIN) {
    return { error: `Pesan terlalu singkat. Tuliskan minimal ${PESAN_MIN} huruf agar admin paham.` };
  }
  if (pesan.length > PESAN_MAKS) {
    return { error: `Pesan terlalu panjang (maksimal ${PESAN_MAKS} huruf).` };
  }
  if (bagian && !BAGIAN_DATA.includes(bagian)) {
    return { error: "Bagian data tidak valid." };
  }
  if (noHp && !/^\+?\d{8,15}$/.test(noHp.replace(/[\s-]/g, ""))) {
    return { error: "Nomor HP tidak valid. Isi angka saja (8–15 digit) atau kosongkan." };
  }

  const s = await siapkanPencarian(formData);
  if (s.error) return { error: s.error };

  const { data: hasil, error } = await s.supabase.rpc("kirim_laporan_data_warga", {
    p_nik: s.nik,
    p_tanggal_lahir: s.tanggal,
    p_bagian: bagian,
    p_pesan: pesan,
    p_no_hp: noHp.replace(/[\s-]/g, ""),
    p_identifier: s.identifier,
  });

  if (error) return { error: "Laporan belum bisa dikirim. Coba lagi nanti." };
  if (!hasil) {
    return { error: "Data tidak cocok. Muat ulang halaman, lalu cari data Anda sekali lagi." };
  }
  if (hasil === "BATAS") {
    return {
      error:
        "Anda masih punya 3 laporan yang belum ditangani admin. Mohon tunggu sampai laporan sebelumnya diproses.",
    };
  }
  return { sukses: true, kode: hasil };
}
