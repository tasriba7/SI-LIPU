import { createClient } from "@/lib/supabase/server";

// Ambil 3 angka agregat untuk kartu statistik di beranda publik, lewat RPC
// `statistik_beranda` (lihat migration 0008) — aman dipanggil tanpa login
// karena hanya mengembalikan count, bukan data individu warga.
//
// Selalu balikan angka (fallback 0), jangan pernah throw ke halaman —
// beranda publik harus tetap tampil normal walau Supabase belum diset
// (mis. saat development lokal tanpa env var terisi).
export async function getStatistikBeranda() {
  const DEFAULT = {
    totalPenduduk: 0,
    totalKepalaKeluarga: 0,
    totalAjuanDiproses: 0,
  };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("statistik_beranda").single();

    if (error || !data) {
      return DEFAULT;
    }

    return {
      totalPenduduk: Number(data.total_penduduk) || 0,
      totalKepalaKeluarga: Number(data.total_kepala_keluarga) || 0,
      totalAjuanDiproses: Number(data.total_ajuan_diproses) || 0,
    };
  } catch {
    return DEFAULT;
  }
}

// Ambil rincian tabel-tabel informasi di beranda publik: jumlah penduduk
// per agama, status pernikahan, jenis kelamin, rentang usia, dan pekerjaan.
// Lewat RPC `statistik_beranda_detail` (migration 0009) — sama seperti
// getStatistikBeranda(), hanya mengembalikan angka agregat per kelompok,
// bukan data individu warga, jadi aman diakses publik tanpa login.
//
// Tiap kelompok dikembalikan sebagai array [{ label, jumlah }, ...] supaya
// gampang di-render langsung jadi baris tabel di komponen client.
export async function getStatistikBerandaDetail() {
  const DEFAULT = {
    perAgama: [],
    perStatusKawin: [],
    perJenisKelamin: [],
    perRentangUsia: [],
    perPekerjaan: [],
  };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("statistik_beranda_detail");

    if (error || !data) {
      return DEFAULT;
    }

    const bersihkan = (arr) =>
      Array.isArray(arr)
        ? arr.map((r) => ({ label: String(r.label), jumlah: Number(r.jumlah) || 0 }))
        : [];

    return {
      perAgama: bersihkan(data.per_agama),
      perStatusKawin: bersihkan(data.per_status_kawin),
      perJenisKelamin: bersihkan(data.per_jenis_kelamin),
      perRentangUsia: bersihkan(data.per_rentang_usia),
      perPekerjaan: bersihkan(data.per_pekerjaan),
    };
  } catch {
    return DEFAULT;
  }
}
