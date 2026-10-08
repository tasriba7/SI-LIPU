// Mesin template surat: mengganti {{variabel}} dengan data warga/desa.
// Dipakai di server (menyusun variabel) dan di browser (editor + pratinjau).
// Murni fungsi biasa, tanpa akses database.

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** "2026-10-09" atau Date -> "9 Oktober 2026". Kosong kalau tidak valid. */
export function formatTanggalId(nilai) {
  if (!nilai) return "";
  const d = nilai instanceof Date ? nilai : new Date(`${String(nilai).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

/** Tanggal hari ini (zona waktu browser/server) dalam format yyyy-mm-dd. */
export function hariIniISO() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const NAMA_HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

const ISO_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

function dariISO(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "1999-09-22" -> "22-09-1999" (gaya angka seperti di surat kelahiran/kematian). */
export function formatTanggalAngka(nilai) {
  if (!nilai || !ISO_TANGGAL.test(String(nilai).slice(0, 10))) return "";
  const d = dariISO(String(nilai).slice(0, 10));
  if (!d) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`;
}

/** "1999-09-22" -> "Rabu". */
export function namaHari(nilai) {
  if (!nilai || !ISO_TANGGAL.test(String(nilai).slice(0, 10))) return "";
  const d = dariISO(String(nilai).slice(0, 10));
  return d ? NAMA_HARI[d.getDay()] : "";
}

/** Selisih tahun penuh antara dua tanggal ISO (usia saat meninggal). "" jika tak valid. */
export function hitungUsiaTahun(lahirISO, akhirISO) {
  const a = dariISO(String(lahirISO || "").slice(0, 10));
  const b = dariISO(String(akhirISO || "").slice(0, 10));
  if (!a || !b || b < a) return "";
  let usia = b.getFullYear() - a.getFullYear();
  const belumUlangTahun =
    b.getMonth() < a.getMonth() ||
    (b.getMonth() === a.getMonth() && b.getDate() < a.getDate());
  if (belumUlangTahun) usia -= 1;
  return usia;
}

const KATA_KECIL = new Set(["dan", "di", "ke", "dari", "yang", "untuk", "atau"]);

/**
 * "BANGGAI KEPULAUAN" / "banggai kepulauan" -> "Banggai Kepulauan".
 * Kata berangka (RT 03, 12A) dan singkatan RT/RW dibiarkan; kata sambung
 * (dan, di, ke, ...) tetap huruf kecil kecuali di awal.
 */
export function judulKata(teks) {
  return String(teks ?? "")
    .trim()
    .split(/(\s+)/)
    .map((kata, i, semua) => {
      if (!kata.trim() || /\d/.test(kata)) return kata;
      if (/^(rt|rw)[.,/]?$/i.test(kata)) return kata.toUpperCase();
      const kecil = kata.toLowerCase();
      const awal = semua.slice(0, i).every((k) => !k.trim());
      if (!awal && KATA_KECIL.has(kecil)) return kecil;
      // Huruf besar di awal tiap bagian yang dipisah tanda hubung / kurung / titik.
      return kecil.replace(/(^|[-(./])([a-z])/g, (_, a, b) => a + b.toUpperCase());
    })
    .join("");
}

/** Rapikan HANYA bila seluruhnya huruf besar (atau tanpa huruf kecil); teks campuran dibiarkan. */
export function judulBilaKapital(teks) {
  const t = String(teks ?? "");
  return t && t === t.toUpperCase() && /[A-Z]/.test(t) ? judulKata(t) : t;
}

const NAMA_JK = { L: "Laki-laki", P: "Perempuan" };

/**
 * Susun kamus variabel dari pengajuan + warga (boleh null) + config desa.
 * Kalau warga_id kosong (NIK belum terdata), jatuh ke isian form pengajuan;
 * kolom yang tidak ada dibiarkan kosong supaya disorot di editor.
 */
export function susunVariabel({ pengajuan, warga, config }) {
  const w = warga || {};
  const tambahan = pengajuan?.data_tambahan || {};

  const alamatBagian = [
    w.alamat,
    w.dusun ? `Dusun ${w.dusun}` : null,
    w.rt || w.rw ? `RT ${w.rt || "-"} / RW ${w.rw || "-"}` : null,
  ].filter(Boolean);

  const tempatLahir = judulBilaKapital(w.tempat_lahir || tambahan.tempat_lahir || "");
  const tanggalLahir = formatTanggalId(w.tanggal_lahir || tambahan.tanggal_lahir);

  const vars = {
    // Data pemohon
    nama: w.nama_lengkap || pengajuan?.nama_pemohon || "",
    nik: w.nik || pengajuan?.nik || "",
    tempat_lahir: tempatLahir,
    tanggal_lahir: tanggalLahir,
    ttl: [tempatLahir, tanggalLahir].filter(Boolean).join(", "),
    jenis_kelamin: NAMA_JK[w.jenis_kelamin] || tambahan.jenis_kelamin || "",
    agama: judulBilaKapital(w.agama || tambahan.agama || ""),
    pekerjaan: judulBilaKapital(w.pekerjaan || tambahan.pekerjaan || ""),
    status_kawin: judulBilaKapital(w.status_kawin || tambahan.status_kawin || ""),
    alamat: judulBilaKapital(alamatBagian.join(", ") || tambahan.alamat || ""),
    keperluan: pengajuan?.keterangan || "",
    // Identitas desa (dari config_desa, JANGAN hardcode)
    // Nama wilayah SELALU dirapikan (admin mungkin mengetik huruf besar semua).
    nama_desa: judulKata(config?.nama_desa || ""),
    jenis_wilayah: judulKata(config?.jenis_wilayah || "Desa"),
    kecamatan: judulKata(config?.kecamatan || ""),
    kabupaten: judulKata(config?.kabupaten || ""),
    provinsi: judulKata(config?.provinsi || ""),
  };

  // Semua isian Form Builder ikut tersedia: {{jenis_usaha}}, {{nama_ibu}}, dst.
  // Isian bertanda tangan ISO (field bertipe "tanggal") otomatis punya 3 bentuk:
  //   {{key}} = 22 September 1999, {{key_angka}} = 22-09-1999, {{key_hari}} = Rabu
  for (const [k, v] of Object.entries(tambahan)) {
    const teks = v == null ? "" : String(v);
    if (ISO_TANGGAL.test(teks)) {
      const panjang = formatTanggalId(teks);
      if (!(k in vars) || !vars[k]) vars[k] = panjang;
      vars[`${k}_angka`] = formatTanggalAngka(teks);
      vars[`${k}_hari`] = namaHari(teks);
    } else if (!(k in vars) || !vars[k]) {
      vars[k] = /^(alamat|tempat_lahir|pekerjaan|agama)/.test(k) ? judulBilaKapital(teks) : teks;
    }
  }

  // Alamat orang yang diterangkan (bayi/almarhum) bila tidak diisi = alamat pemohon.
  if (!vars.alamat_anak) vars.alamat_anak = vars.alamat;
  if (!vars.alamat_almarhum) vars.alamat_almarhum = vars.alamat;

  // Usia almarhum dihitung otomatis dari tanggal lahir & tanggal meninggal.
  if (!vars.usia_almarhum) {
    const usia = hitungUsiaTahun(tambahan.tanggal_lahir_almarhum, tambahan.tanggal_meninggal);
    vars.usia_almarhum = usia === "" ? "" : `${usia} tahun`;
  }
  return vars;
}

/** Ganti {{variabel}}; variabel tak dikenal/kosong menjadi string kosong. */
export function isiVariabel(teks, vars) {
  return String(teks ?? "").replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_, key) => {
    const v = vars[key];
    return v == null ? "" : String(v);
  });
}

/** Rapikan hasil penggantian: spasi ganda, spasi sebelum koma/titik. */
function rapikan(teks) {
  return teks
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/,\s*,/g, ",")
    .replace(/^\s*,\s*/, "")
    .replace(/\s*,\s*$/, "")
    .trim();
}

/**
 * Template (baris DB) + variabel -> draf surat yang bisa diedit.
 * Draf inilah yang disimpan sebagai snapshot di surat_terbit.isi.
 */
export function buatDraf(template, vars) {
  const isiBio = (daftar) =>
    (Array.isArray(daftar) ? daftar : []).map((b) => ({
      label: b.label,
      value: rapikan(isiVariabel(b.value, vars)),
    }));
  return {
    judul_atas: template.judul_atas || "",
    judul: template.judul,
    pembuka: rapikan(isiVariabel(template.pembuka, vars)),
    biodata: isiBio(template.biodata),
    teks_tengah: rapikan(isiVariabel(template.teks_tengah, vars)),
    biodata2: isiBio(template.biodata2),
    isi: rapikan(isiVariabel(template.isi, vars)),
    penutup: rapikan(isiVariabel(template.penutup, vars)),
  };
}

/** Nama penandatangan & jabatan untuk blok tanda tangan. */
export function buatPenandatangan({ mode, namaKades, namaSekdes, nip }) {
  if (mode === "sekdes") {
    return {
      mode,
      jabatan_awal: "a.n. Kepala Desa",
      jabatan: "Sekretaris Desa",
      nama: namaSekdes || "",
      nip: nip || "",
    };
  }
  return {
    mode: "kades",
    jabatan_awal: "",
    jabatan: "Kepala Desa",
    nama: namaKades || "",
    nip: nip || "",
  };
}

/** Variabel bawaan untuk panduan di halaman Kelola Template Surat. */
export const VARIABEL_BAWAAN = [
  { kunci: "nama", ket: "Nama pemohon" },
  { kunci: "nik", ket: "NIK pemohon" },
  { kunci: "tempat_lahir", ket: "Tempat lahir pemohon" },
  { kunci: "tanggal_lahir", ket: "Tanggal lahir pemohon (22 September 1999)" },
  { kunci: "ttl", ket: "Tempat, tanggal lahir pemohon" },
  { kunci: "jenis_kelamin", ket: "Laki-laki / Perempuan" },
  { kunci: "agama", ket: "Agama pemohon" },
  { kunci: "pekerjaan", ket: "Pekerjaan pemohon" },
  { kunci: "status_kawin", ket: "Status perkawinan" },
  { kunci: "alamat", ket: "Alamat lengkap pemohon (dusun, RT/RW)" },
  { kunci: "keperluan", ket: "Isian keperluan/keterangan dari warga" },
  { kunci: "nama_desa", ket: "Nama desa (dari Pengaturan Desa)" },
  { kunci: "jenis_wilayah", ket: "Desa / Kelurahan" },
  { kunci: "kecamatan", ket: "Kecamatan" },
  { kunci: "kabupaten", ket: "Kabupaten" },
  { kunci: "provinsi", ket: "Provinsi" },
];
