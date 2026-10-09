// Logika SERVER untuk Tautan Bagikan Data (sekali pakai).
// JANGAN diimpor dari Client Component (memakai node:crypto + client admin).

import { createHash, randomBytes } from "node:crypto";
import { getConfigDesa, labelWilayah } from "@/lib/configDesa";
import { KOLOM_PENDUDUK, SEKSI_IDS } from "@/lib/tautanDataSeksi";

const UKURAN_HALAMAN = 1000;

/** Token acak 256-bit (43 karakter URL-safe). Tidak turunan dari data apa pun. */
export function buatToken() {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function tokenValid(token) {
  return typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token);
}

/**
 * status: "aktif" | "dibuka" | "kedaluwarsa" | "dibatalkan" | "tidak_ditemukan"
 * (kedaluwarsa dihitung dari waktu, bukan disimpan di database).
 */
export function hitungStatus(baris, sekarang = new Date()) {
  if (!baris) return "tidak_ditemukan";
  if (baris.status === "dibuka") return "dibuka";
  if (baris.status === "dibatalkan") return "dibatalkan";
  if (new Date(baris.kedaluwarsa_pada) <= sekarang) return "kedaluwarsa";
  return "aktif";
}

/**
 * Baca tautan TANPA menghanguskannya. Dipakai halaman peringatan, jadi
 * pratinjau tautan (WhatsApp, dll.) atau kunjungan sekilas tidak memakai
 * jatah satu kali itu.
 */
export async function cekTautan(admin, token) {
  const config = await getConfigDesa(admin);
  const desa = {
    nama: config.nama_desa || "",
    jenis: config.jenis_wilayah || "Desa",
    wilayah: labelWilayah(config),
  };

  if (!tokenValid(token)) return { status: "tidak_ditemukan", desa };

  const { data: baris } = await admin
    .from("tautan_data")
    .select("id, instansi, keperluan, seksi, status, kedaluwarsa_pada")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  return { status: hitungStatus(baris), baris, desa };
}

async function ambilSemua(buatQuery) {
  const semua = [];
  let dari = 0;
  while (true) {
    const { data, error } = await buatQuery().range(dari, dari + UKURAN_HALAMAN - 1);
    if (error) throw new Error(error.message);
    semua.push(...(data ?? []));
    if (!data || data.length < UKURAN_HALAMAN) break;
    dari += UKURAN_HALAMAN;
  }
  return semua;
}

const bersihkan = (arr) =>
  Array.isArray(arr)
    ? arr.map((r) => ({ label: String(r.label), jumlah: Number(r.jumlah) || 0 }))
    : [];

/**
 * Ambil data sesuai centang admin. Dipanggil SEBELUM tautan dihanguskan,
 * supaya kalau pengambilan gagal, tautan belum terpakai dan bisa dicoba lagi.
 * Hanya isi yang dicentang yang diambil.
 */
export async function ambilDataTautan(admin, seksi) {
  const pilih = new Set((seksi ?? []).filter((s) => SEKSI_IDS.includes(s)));
  const hasil = {};

  let warga = null;
  if (pilih.has("penduduk_lengkap") || pilih.has("data_keluarga")) {
    warga = await ambilSemua(() =>
      admin
        .from("warga")
        .select(KOLOM_PENDUDUK.join(","))
        .eq("status_kependudukan", "aktif")
        .order("nama_lengkap")
        .order("nik")
    );
  }

  if (pilih.has("penduduk_lengkap")) {
    hasil.penduduk = warga.map((w) => KOLOM_PENDUDUK.map((k) => w[k] ?? ""));
  }

  if (pilih.has("data_keluarga")) {
    const keluarga = await ambilSemua(() =>
      admin
        .from("keluarga")
        .select("no_kk, alamat, dusun, rt, rw")
        .order("no_kk")
    );
    const anggota = new Map();
    for (const w of warga) {
      if (!w.no_kk) continue;
      if (!anggota.has(w.no_kk)) anggota.set(w.no_kk, []);
      anggota.get(w.no_kk).push(w);
    }
    hasil.keluarga = keluarga.map((k) => {
      const daftar = anggota.get(k.no_kk) ?? [];
      const kepala = daftar.find((a) => a.status_dalam_kk === "Kepala Keluarga");
      return [
        k.no_kk,
        kepala?.nama_lengkap ?? "",
        k.alamat ?? "",
        k.dusun ?? "",
        k.rt ?? "",
        k.rw ?? "",
        daftar.length,
      ];
    });
  }

  if (pilih.has("statistik_penduduk")) {
    const { data: detail, error } = await admin.rpc("statistik_beranda_detail");
    if (error || !detail) throw new Error("Statistik tidak bisa diambil.");

    // Per dusun: opsional (migrasi 0016). Kalau belum ada, bagian ini kosong.
    const { data: dusun } = await admin.rpc("statistik_beranda_dusun");

    hasil.statistik = {
      detail: {
        perAgama: bersihkan(detail.per_agama),
        perStatusKawin: bersihkan(detail.per_status_kawin),
        perJenisKelamin: bersihkan(detail.per_jenis_kelamin),
        perRentangUsia: bersihkan(detail.per_rentang_usia),
        perPekerjaan: bersihkan(detail.per_pekerjaan),
      },
      perDusun: Array.isArray(dusun)
        ? dusun.map((r) => ({
            label: String(r.label),
            jumlah: Number(r.jumlah) || 0,
            laki: Number(r.laki) || 0,
            perempuan: Number(r.perempuan) || 0,
          }))
        : [],
    };
  }

  return hasil;
}
