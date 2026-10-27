// Penyeragaman isian kependudukan yang nilainya dipakai untuk STATISTIK:
// agama, status kawin, status dalam KK, pendidikan, dan pekerjaan.
//
// Masalah yang diselesaikan: di file Excel orang menulis "nikah", "Nikah",
// "NIKAH", "islam", "ISLAM", "Budha" dst. Database menganggap itu nilai yang
// berbeda, sehingga statistik terpecah jadi beberapa baris. Di sini semua
// penulisan itu dicocokkan ke satu penulisan baku (sama dengan pilihan dropdown
// di form Tambah/Edit Warga).
//
// Cara cocok: huruf dikecilkan, lalu semua selain huruf/angka dibuang
// ("Belum/Tidak Bekerja" -> "belumtidakbekerja"). Jadi besar/kecil huruf, spasi,
// garis miring, dan tanda hubung tidak berpengaruh.
//
// Mau menambah penulisan lain yang sering muncul di Excel Anda? Cukup tambah
// baris di tabel ALIAS_* di bawah: "penulisan di Excel": "penulisan baku".
// Penulisan baku (nilai di sebelah kanan) HARUS sama persis dengan salah satu
// isi daftar *_OPTIONS.
//
// Catatan: SQL di migrasi 0068 punya aturan yang sama untuk statistik
// (fungsi baku_agama & baku_status_kawin). Kalau alias agama/status kawin
// diubah di sini, ubah juga di sana supaya konsisten.

import { PEKERJAAN_OPTIONS } from "@/lib/pekerjaanOptions";
import { PENDIDIKAN_OPTIONS } from "@/lib/pendidikanOptions";

// Pilihan baku — sama persis dengan dropdown di form.
export const AGAMA_OPTIONS = [
  "Islam",
  "Kristen Protestan",
  "Katolik",
  "Hindu",
  "Buddha",
  "Konghucu",
  "Lainnya",
];
export const STATUS_KAWIN_OPTIONS = ["Belum Kawin", "Kawin", "Cerai Hidup", "Cerai Mati"];
export const STATUS_DALAM_KK_OPTIONS = [
  "Kepala Keluarga",
  "Istri",
  "Anak",
  "Famili Lain",
  "Lainnya",
];

const ALIAS_AGAMA = {
  muslim: "Islam",
  kristen: "Kristen Protestan",
  protestan: "Kristen Protestan",
  "kristen katolik": "Katolik",
  katholik: "Katolik",
  budha: "Buddha",
  khonghucu: "Konghucu",
  konghuchu: "Konghucu",
  kepercayaan: "Lainnya",
  "kepercayaan terhadap tuhan yme": "Lainnya",
  lain: "Lainnya",
  "lain-lain": "Lainnya",
};

const ALIAS_STATUS_KAWIN = {
  nikah: "Kawin",
  menikah: "Kawin",
  "sudah kawin": "Kawin",
  "sudah nikah": "Kawin",
  "sudah menikah": "Kawin",
  "kawin tercatat": "Kawin",
  "kawin tidak tercatat": "Kawin",
  "belum nikah": "Belum Kawin",
  "belum menikah": "Belum Kawin",
  "tidak kawin": "Belum Kawin",
  lajang: "Belum Kawin",
  ch: "Cerai Hidup",
  cm: "Cerai Mati",
};

const ALIAS_STATUS_DALAM_KK = {
  kepala: "Kepala Keluarga",
  kk: "Kepala Keluarga",
  "kepala rumah tangga": "Kepala Keluarga",
  isteri: "Istri",
  famili: "Famili Lain",
  "keluarga lain": "Famili Lain",
  // Hubungan keluarga di KK asli yang tidak punya pilihan sendiri di aplikasi.
  menantu: "Famili Lain",
  cucu: "Famili Lain",
  "orang tua": "Famili Lain",
  mertua: "Famili Lain",
  saudara: "Famili Lain",
  pembantu: "Lainnya",
  lain: "Lainnya",
  "lain-lain": "Lainnya",
};

const ALIAS_PENDIDIKAN = {
  "tidak sekolah": "Tidak/Belum Sekolah",
  "belum sekolah": "Tidak/Belum Sekolah",
  "belum tamat sd": "Belum Tamat SD/Sederajat",
  "tidak tamat sd": "Belum Tamat SD/Sederajat",
  sd: "Tamat SD/Sederajat",
  "tamat sd": "Tamat SD/Sederajat",
  "sd sederajat": "Tamat SD/Sederajat",
  smp: "SLTP/Sederajat",
  "tamat smp": "SLTP/Sederajat",
  "smp sederajat": "SLTP/Sederajat",
  sltp: "SLTP/Sederajat",
  sma: "SLTA/Sederajat",
  smu: "SLTA/Sederajat",
  smk: "SLTA/Sederajat",
  "tamat sma": "SLTA/Sederajat",
  "sma sederajat": "SLTA/Sederajat",
  slta: "SLTA/Sederajat",
  d1: "Diploma I/II",
  d2: "Diploma I/II",
  "d1/d2": "Diploma I/II",
  "diploma i": "Diploma I/II",
  "diploma ii": "Diploma I/II",
  d3: "Akademi/Diploma III/Sarjana Muda",
  "diploma iii": "Akademi/Diploma III/Sarjana Muda",
  akademi: "Akademi/Diploma III/Sarjana Muda",
  "sarjana muda": "Akademi/Diploma III/Sarjana Muda",
  d4: "Diploma IV/Strata I",
  "diploma iv": "Diploma IV/Strata I",
  s1: "Diploma IV/Strata I",
  "strata i": "Diploma IV/Strata I",
  "strata 1": "Diploma IV/Strata I",
  sarjana: "Diploma IV/Strata I",
  s2: "Strata II",
  "strata 2": "Strata II",
  magister: "Strata II",
  s3: "Strata III",
  "strata 3": "Strata III",
  doktor: "Strata III",
};

const ALIAS_PEKERJAAN = {
  pns: "Pegawai Negeri Sipil (PNS)",
  "pegawai negeri sipil": "Pegawai Negeri Sipil (PNS)",
  tni: "Tentara Nasional Indonesia (TNI)",
  polri: "Kepolisian RI (POLRI)",
  polisi: "Kepolisian RI (POLRI)",
  petani: "Petani/Pekebun",
  nelayan: "Nelayan/Perikanan",
  pelajar: "Pelajar/Mahasiswa",
  mahasiswa: "Pelajar/Mahasiswa",
  irt: "Mengurus Rumah Tangga",
  "ibu rumah tangga": "Mengurus Rumah Tangga",
  "tidak bekerja": "Belum/Tidak Bekerja",
  "belum bekerja": "Belum/Tidak Bekerja",
  swasta: "Karyawan Swasta",
  "pegawai swasta": "Karyawan Swasta",
  karyawan: "Karyawan Swasta",
  honorer: "Karyawan Honorer",
  "buruh harian": "Buruh Harian Lepas",
  berdagang: "Pedagang",
  supir: "Sopir",
};

/** Kunci pembanding: huruf kecil, hanya huruf & angka. "Belum/Tidak" -> "belumtidak". */
export function kunciBanding(nilai) {
  return String(nilai ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Rapikan spasi: buang spasi di awal/akhir dan ubah spasi ganda jadi satu. */
export function rapikanSpasi(nilai) {
  return String(nilai ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function buatPencocok(daftarBaku, alias = {}) {
  const peta = new Map();
  for (const baku of daftarBaku) peta.set(kunciBanding(baku), baku);
  for (const [tulisan, baku] of Object.entries(alias)) peta.set(kunciBanding(tulisan), baku);
  // Mengembalikan penulisan baku, atau null kalau tidak dikenali.
  return (nilai) => peta.get(kunciBanding(nilai)) ?? null;
}

export const cocokkanAgama = buatPencocok(AGAMA_OPTIONS, ALIAS_AGAMA);
export const cocokkanStatusKawin = buatPencocok(STATUS_KAWIN_OPTIONS, ALIAS_STATUS_KAWIN);
export const cocokkanStatusDalamKk = buatPencocok(STATUS_DALAM_KK_OPTIONS, ALIAS_STATUS_DALAM_KK);
export const cocokkanPendidikan = buatPencocok(PENDIDIKAN_OPTIONS, ALIAS_PENDIDIKAN);
export const cocokkanPekerjaan = buatPencocok(PEKERJAAN_OPTIONS, ALIAS_PEKERJAAN);

/**
 * Seragamkan isian satu baris impor Excel. Mengubah objek `baris` langsung.
 *
 * - Agama, status kawin, status dalam KK: HARUS salah satu pilihan baku
 *   (huruf besar/kecil bebas). Selain itu baris ditolak dengan pesan jelas,
 *   sama seperti jenis kelamin.
 * - Pendidikan dan pekerjaan: kalau cocok pilihan baku dipakai penulisan baku;
 *   kalau tidak, teks asli tetap disimpan (hanya spasinya dirapikan) karena
 *   daftar pekerjaan di desa memang bisa beragam.
 *
 * Mengembalikan { error } bila ada nilai yang ditolak, atau {} bila beres.
 */
export function normalisasiIsianImport(baris) {
  const wajibBaku = [
    ["agama", "Agama", AGAMA_OPTIONS, cocokkanAgama],
    ["status_kawin", "Status kawin", STATUS_KAWIN_OPTIONS, cocokkanStatusKawin],
    ["status_dalam_kk", "Status dalam KK", STATUS_DALAM_KK_OPTIONS, cocokkanStatusDalamKk],
  ];

  for (const [kolom, label, daftar, cocokkan] of wajibBaku) {
    const mentah = baris[kolom];
    if (!mentah) continue;
    const baku = cocokkan(mentah);
    if (!baku) {
      return {
        error: `${label} "${mentah}" tidak dikenali. Isi dengan salah satu: ${daftar.join(" / ")}.`,
      };
    }
    baris[kolom] = baku;
  }

  if (baris.pendidikan) {
    baris.pendidikan = cocokkanPendidikan(baris.pendidikan) ?? rapikanSpasi(baris.pendidikan);
  }
  if (baris.pekerjaan) {
    baris.pekerjaan = cocokkanPekerjaan(baris.pekerjaan) ?? rapikanSpasi(baris.pekerjaan);
  }

  return {};
}
