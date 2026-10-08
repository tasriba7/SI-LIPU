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

  const tempatLahir = w.tempat_lahir || tambahan.tempat_lahir || "";
  const tanggalLahir = formatTanggalId(w.tanggal_lahir || tambahan.tanggal_lahir);

  const vars = {
    // Data pemohon
    nama: w.nama_lengkap || pengajuan?.nama_pemohon || "",
    nik: w.nik || pengajuan?.nik || "",
    tempat_lahir: tempatLahir,
    tanggal_lahir: tanggalLahir,
    ttl: [tempatLahir, tanggalLahir].filter(Boolean).join(", "),
    jenis_kelamin: NAMA_JK[w.jenis_kelamin] || tambahan.jenis_kelamin || "",
    agama: w.agama || tambahan.agama || "",
    pekerjaan: w.pekerjaan || tambahan.pekerjaan || "",
    status_kawin: w.status_kawin || tambahan.status_kawin || "",
    alamat: alamatBagian.join(", ") || tambahan.alamat || "",
    keperluan: pengajuan?.keterangan || "",
    // Identitas desa (dari config_desa, JANGAN hardcode)
    nama_desa: config?.nama_desa || "",
    jenis_wilayah: config?.jenis_wilayah || "Desa",
    kecamatan: config?.kecamatan || "",
    kabupaten: config?.kabupaten || "",
    provinsi: config?.provinsi || "",
  };

  // Semua isian Form Builder ikut tersedia: {{jenis_usaha}}, {{nama_ibu}}, dst.
  for (const [k, v] of Object.entries(tambahan)) {
    if (!(k in vars) || !vars[k]) vars[k] = v == null ? "" : String(v);
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
    .trim();
}

/**
 * Template (baris DB) + variabel -> draf surat yang bisa diedit.
 * Draf inilah yang disimpan sebagai snapshot di surat_terbit.isi.
 */
export function buatDraf(template, vars) {
  const biodata = Array.isArray(template.biodata) ? template.biodata : [];
  return {
    judul: template.judul,
    pembuka: rapikan(isiVariabel(template.pembuka, vars)),
    biodata: biodata.map((b) => ({
      label: b.label,
      value: rapikan(isiVariabel(b.value, vars)),
    })),
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
