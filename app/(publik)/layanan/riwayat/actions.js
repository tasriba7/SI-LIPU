"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { ambilIdentifier } from "@/lib/lookupWarga";
import {
  mulaiVerifikasiTempatLahir,
  periksaPilihanTempatLahir,
} from "@/lib/verifikasiTempatLahir";

const BATAS_GAGAL = 5;
const JENDELA_MENIT = 15;

const PESAN_KOSONG =
  "Tidak ada riwayat ditemukan. Pastikan NIK dan tanggal lahir benar, atau Anda memang belum pernah mengajukan layanan dengan identitas tersebut.";

function validasi(nik, tanggal) {
  if (!nik || !tanggal) return "NIK dan tanggal lahir wajib diisi.";
  if (!/^\d{16}$/.test(nik)) return "NIK harus berupa 16 digit angka.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return "Tanggal lahir tidak valid.";
  return null;
}

async function ambilRiwayat(supabase, nik, tanggal, identifier) {
  const { data, error } = await supabase.rpc("riwayat_pengajuan_publik", {
    p_nik: nik,
    p_tanggal_lahir: tanggal,
    p_identifier: identifier,
  });

  if (error) {
    return { error: "Riwayat belum bisa dimuat. Coba lagi nanti." };
  }
  if (!data || data.length === 0) {
    // Sama untuk "data tidak cocok" dan "belum pernah mengajukan".
    return { kosong: true, pesan: PESAN_KOSONG };
  }
  return { riwayat: data };
}

/**
 * Riwayat pengajuan milik warga, lewat NIK + tanggal lahir + tebak tempat
 * lahir (tiga faktor). Ikuti docs/SECURITY.md: rate limit di server, pesan
 * generik, tanpa membedakan "data salah" dan "belum ada pengajuan".
 *
 * Langkah 1 (fungsi ini): cek NIK + tanggal lahir lalu mulai tantangan tempat
 * lahir. Riwayat BARU dikirim setelah pilihan benar (periksaTempatLahirRiwayat).
 *
 * Fungsi database hanya bisa dijalankan service_role (migrasi 0029), jadi
 * batas percobaan di bawah tidak bisa dilewati lewat API Supabase langsung.
 */
export async function cariRiwayat(prevState, formData) {
  const nik = String(formData.get("nik") ?? "").trim();
  const tanggal = String(formData.get("tanggal_lahir") ?? "").trim();

  const salah = validasi(nik, tanggal);
  if (salah) return { error: salah };

  const identifier = await ambilIdentifier();
  const supabase = createAdminClient();

  const { data: jumlahGagal, error: errHitung } = await supabase.rpc("hitung_percobaan_gagal", {
    p_identifier: identifier,
    p_menit: JENDELA_MENIT,
  });
  // Gagal-tertutup: kalau batas tidak bisa dicek, jangan lanjut mencari.
  if (errHitung || jumlahGagal >= BATAS_GAGAL) {
    return { error: "Terlalu banyak percobaan. Coba lagi dalam beberapa menit." };
  }

  const { data: cocok, error: errCari } = await supabase
    .rpc("cari_warga_publik", {
      p_nik: nik,
      p_tanggal_lahir: tanggal,
      p_identifier: identifier,
    })
    .maybeSingle();
  if (errCari) return { error: "Riwayat belum bisa dimuat. Coba lagi nanti." };
  if (!cocok) return { kosong: true, pesan: PESAN_KOSONG };

  const tl = await mulaiVerifikasiTempatLahir(supabase, cocok.warga_id, nik);
  if (tl.batal) return { error: tl.pesan };
  if (!tl.lewati) {
    return {
      verifikasi: { opsi: tl.opsi, tiket: tl.tiket, sisa: tl.sisa },
      nik,
      tanggal,
    };
  }

  // Tempat lahir belum terisi di data kependudukan -> tidak bisa ditanyakan.
  return ambilRiwayat(supabase, nik, tanggal, identifier);
}

/** Langkah 2: pilihan tempat lahir benar -> kirim riwayat. Salah 3 kali -> { batal, pesan }. */
export async function periksaTempatLahirRiwayat(nik, tanggal, tiket, pilihan) {
  const nikBersih = String(nik ?? "").trim();
  const tanggalBersih = String(tanggal ?? "").trim();
  if (validasi(nikBersih, tanggalBersih)) {
    return { error: "Verifikasi tidak valid. Ulangi dari awal." };
  }

  const supabase = createAdminClient();
  const r = await periksaPilihanTempatLahir(supabase, nikBersih, tiket, pilihan);
  if (!r.ok) return r;

  const identifier = await ambilIdentifier();
  const hasil = await ambilRiwayat(supabase, nikBersih, tanggalBersih, identifier);
  return hasil.error ? hasil : { ok: true, ...hasil };
}
