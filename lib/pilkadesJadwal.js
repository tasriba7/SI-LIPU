// Jadwal tahapan Pilkades: daftar tahapan, penghitungan status, dan pembacaan data.
// Logika murni (tanpa database) ada di bagian atas supaya mudah diuji.

/**
 * Daftar STANDAR (dipakai selama panitia belum menyimpan jadwal sendiri, dan oleh
 * tombol "Kembalikan ke daftar standar"). Panitia bebas mengganti nama, menambah,
 * menghapus, dan mengubah urutan.
 * `jenis` = tahap yang ditandai selesai OTOMATIS dari data aplikasi:
 *   dps | dpt | calon | hasil | pemungutan (tanggal mengikuti menu Periode).
 */
export const TAHAPAN_STANDAR = [
  { nama: "Persiapan & Pembentukan Panitia", arti: "Panitia dibentuk dan susunannya dicatat." },
  { jenis: "dps", nama: "Penyusunan Daftar Pemilih", arti: "Data warga diambil, diperiksa, dan ditempatkan ke TPS." },
  { nama: "Pengumuman DPS & Tanggapan Warga", arti: "Daftar sementara ditempel agar warga memeriksa namanya." },
  { jenis: "dpt", nama: "Penetapan Daftar Pemilih Tetap (DPT)", arti: "Daftar final ditetapkan setelah tanggapan warga diperiksa." },
  { nama: "Pendaftaran & Seleksi Calon", arti: "Calon mendaftar dan berkasnya diperiksa." },
  { jenis: "calon", nama: "Penetapan Calon & Nomor Urut", arti: "Calon yang lolos ditetapkan dan diberi nomor urut." },
  { nama: "Masa Kampanye", arti: "Calon menyampaikan visi dan misi kepada warga." },
  { nama: "Masa Tenang", arti: "Tidak ada kampanye menjelang hari pemungutan." },
  { jenis: "pemungutan", nama: "Pemungutan & Penghitungan Suara", arti: "Hari pencoblosan." },
  { jenis: "hasil", nama: "Penetapan Calon Terpilih", arti: "Hasil suara direkap dan calon terpilih ditetapkan." },
];

export const JENIS_OTOMATIS = ["dps", "dpt", "calon", "hasil", "pemungutan"];

/** Keterangan singkat untuk panitia: apa yang terjadi otomatis pada tahap berjenis tertentu. */
export const KET_OTOMATIS = {
  dps: "Selesai otomatis saat DPS ditetapkan.",
  dpt: "Selesai otomatis saat DPT ditetapkan.",
  calon: "Selesai otomatis saat ada calon berstatus “Ditetapkan”.",
  hasil: "Selesai otomatis saat calon terpilih ditetapkan.",
  pemungutan: "Tanggalnya mengikuti menu Periode Pilkades.",
};

/** Halaman kerja yang relevan (hanya untuk tahap berjenis otomatis). */
export const HALAMAN_JENIS = {
  // DPS baru dianggap selesai saat ditetapkan (Langkah 5). Halaman penetapan
  // memuat daftar syarat dengan tautan "Perbaiki" ke Langkah 1–4 bila belum siap.
  dps: "/dashboard/pilkades/daftar",
  dpt: "/dashboard/pilkades/daftar",
  calon: "/dashboard/pilkades/calon",
  hasil: "/dashboard/pilkades/hari-h/hasil",
  pemungutan: "/dashboard/pilkades/hari-h/hadir",
};

/**
 * Tahap tanpa `jenis` tidak tersimpan dengan halaman kerja, jadi halamannya ditebak
 * dari kata di namanya (tetap jalan walau panitia mengganti nama sedikit).
 */
export function tebakHalaman(nama) {
  const n = String(nama ?? "").toLowerCase();
  if (/panitia/.test(n)) return "/dashboard/pilkades/pengaturan/panitia";
  if (/pengumuman|tanggapan/.test(n)) return "/dashboard/pilkades/cetak";
  if (/calon/.test(n)) return "/dashboard/pilkades/calon";
  return null;
}

export const MAKS_TAHAPAN = 30;

const MS_HARI = 86400000;

/** Tanggal hari ini (YYYY-MM-DD) menurut WITA, bukan jam server. */
export function hariIniWita(sekarang = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Makassar", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(sekarang);
}

const hitungHari = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / MS_HARI);

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const pecah = (t) => {
  const [y, m, d] = t.split("-").map(Number);
  return { y, m: m - 1, d };
};

/** "12 Nov 2026" atau "12–14 Nov 2026" atau "30 Okt – 2 Nov 2026". */
export function formatRentang(mulai, selesai) {
  if (!mulai) return "";
  const a = pecah(mulai);
  if (!selesai || selesai === mulai) return `${a.d} ${BULAN[a.m]} ${a.y}`;
  const b = pecah(selesai);
  if (a.y !== b.y) return `${a.d} ${BULAN[a.m]} ${a.y} – ${b.d} ${BULAN[b.m]} ${b.y}`;
  if (a.m !== b.m) return `${a.d} ${BULAN[a.m]} – ${b.d} ${BULAN[b.m]} ${b.y}`;
  return `${a.d}–${b.d} ${BULAN[a.m]} ${a.y}`;
}

/**
 * Status satu tahapan.
 *  - "selesai"   : sudah dikerjakan (data) atau jadwalnya sudah lewat (tahap tanpa pemeriksa data)
 *  - "berlangsung": hari ini ada di dalam jadwal
 *  - "akan"      : jadwal belum mulai
 *  - "terlewat"  : jadwal sudah lewat tetapi pekerjaannya belum tercatat
 *  - "kosong"    : belum dijadwalkan
 * `dikerjakan`: true/false bila ada pemeriksa data, null bila tidak ada.
 */
export function statusTahap({ mulai, selesai, dikerjakan }, hariIni) {
  if (dikerjakan === true) return { s: "selesai", ket: "Sudah dikerjakan" };
  if (!mulai) return { s: "kosong", ket: "Belum dijadwalkan" };
  const akhir = selesai || mulai;
  if (hariIni < mulai) {
    const n = hitungHari(hariIni, mulai);
    return { s: "akan", ket: n === 1 ? "Besok" : `${n} hari lagi` };
  }
  if (hariIni <= akhir) {
    const sisa = hitungHari(hariIni, akhir);
    return { s: "berlangsung", ket: sisa === 0 ? (mulai === akhir ? "Hari ini" : "Hari terakhir") : `Berakhir ${sisa} hari lagi` };
  }
  if (dikerjakan === false) {
    return { s: "terlewat", ket: `Jadwal lewat ${hitungHari(akhir, hariIni)} hari, belum dikerjakan` };
  }
  return { s: "selesai", ket: "Jadwal sudah lewat" };
}

/**
 * PENJAGA TANGGAL: apakah tahap ini BELUM boleh dijalankan karena tanggal mulainya belum tiba?
 * Mengembalikan null bila boleh (tanggal sudah tiba/lewat, atau tahap belum dijadwalkan),
 * atau { mulai, pesan } bila belum waktunya. Hanya tanggal MULAI yang dihitung: setelah
 * tanggal selesai lewat, tahap tetap boleh dikerjakan (statusnya "Terlewat").
 */
export function cekBelumWaktunya({ nama, mulai }, hariIni) {
  if (!mulai || hariIni >= mulai) return null;
  const n = hitungHari(hariIni, mulai);
  return {
    mulai,
    hariIni,
    pesan:
      `Tahap “${nama}” baru bisa dijalankan mulai ${formatRentang(mulai)} (${n === 1 ? "besok" : `${n} hari lagi`}). ` +
      `Hari ini ${formatRentang(hariIni)}. Bila jadwalnya berubah, panitia dapat menyesuaikannya di menu Jadwal & Pengaturan (tab Jadwal Tahapan).`,
  };
}

/**
 * Gabungkan jadwal tersimpan (atau daftar standar bila belum pernah disimpan)
 * + data otomatis menjadi daftar tahapan siap tampil.
 */
export function bentukGarisWaktu({ jadwal, tanggalPemungutan, data = {}, hariIni }) {
  const tersimpan = (jadwal ?? []).length > 0;
  const sumber = tersimpan ? jadwal : TAHAPAN_STANDAR;
  return sumber.map((r, i) => {
    const jenis = r.jenis || null;
    const tetap = jenis === "pemungutan";
    const mulai = tetap ? tanggalPemungutan || null : r.mulai || null;
    const selesai = tetap ? null : r.selesai || null;
    const dikerjakan = jenis && jenis !== "pemungutan" ? Boolean(data[jenis]) : null;
    return {
      key: r.id ?? `standar-${i}`,
      no: i + 1,
      jenis,
      nama: r.nama,
      arti: r.arti ?? "",
      catatan: r.catatan ?? "",
      href: jenis ? HALAMAN_JENIS[jenis] : tebakHalaman(r.nama),
      mulai,
      selesai,
      rentang: formatRentang(mulai, selesai),
      ...statusTahap({ mulai, selesai, dikerjakan }, hariIni),
    };
  });
}

/** Ringkasan untuk kartu progres: jumlah selesai, tahap sekarang, hitung mundur pemungutan. */
export function ringkasGarisWaktu(tahap, hariIni) {
  const selesai = tahap.filter((t) => t.s === "selesai").length;
  const berlangsung = tahap.filter((t) => t.s === "berlangsung");
  const terlewat = tahap.filter((t) => t.s === "terlewat");
  const akan = tahap.filter((t) => t.s === "akan").sort((a, b) => a.mulai.localeCompare(b.mulai))[0] ?? null;
  const pemungutan = tahap.find((t) => t.jenis === "pemungutan");
  const hMin = pemungutan?.mulai ? hitungHari(hariIni, pemungutan.mulai) : null;
  const dijadwalkan = tahap.filter((t) => t.s !== "kosong").length;
  return {
    total: tahap.length,
    selesai,
    persen: Math.round((selesai / tahap.length) * 100),
    berlangsung,
    terlewat,
    berikut: akan,
    hMin,
    dijadwalkan,
  };
}

/** Peringatan lunak bila urutan tanggal tidak masuk akal (tetap boleh disimpan). */
export function periksaUrutan(tahap) {
  const hasil = [];
  const ada = tahap.filter((t) => t.mulai);
  for (let i = 1; i < ada.length; i++) {
    const sebelum = ada[i - 1];
    const ini = ada[i];
    if (ini.mulai < sebelum.mulai) {
      hasil.push(`“${ini.nama}” dimulai (${formatRentang(ini.mulai)}) sebelum “${sebelum.nama}” (${formatRentang(sebelum.mulai)}).`);
    }
  }
  return hasil;
}

/** Baca jadwal tersimpan + penanda "sudah dikerjakan" dari data yang ada. */
export async function ambilJadwalLengkap(supabase, periode, { arsip } = {}) {
  const [jadwalRes, calonRes, hasilRes, arsipRes] = await Promise.all([
    supabase.from("pilkades_jadwal").select("id, jenis, nama, arti, mulai, selesai, catatan").eq("periode_id", periode.id).order("urutan"),
    supabase.from("pilkades_calon").select("id", { count: "exact", head: true }).eq("periode_id", periode.id).eq("status", "ditetapkan"),
    supabase.from("pilkades_hasil").select("calon_id", { count: "exact", head: true }).eq("periode_id", periode.id),
    arsip
      ? Promise.resolve({ data: arsip })
      : supabase.from("pilkades_daftar_tetap").select("jenis").eq("periode_id", periode.id),
  ]);
  const jenis = new Set((arsipRes.data ?? []).map((a) => a.jenis));
  const data = {
    dps: jenis.has("DPS"),
    dpt: jenis.has("DPT"),
    calon: (calonRes.count ?? 0) > 0,
    hasil: (hasilRes.count ?? 0) > 0,
  };
  const hariIni = hariIniWita();
  const tahap = bentukGarisWaktu({
    jadwal: jadwalRes.data ?? [],
    tanggalPemungutan: periode.tanggal_pemungutan,
    data,
    hariIni,
  });
  return {
    tahap,
    hariIni,
    data,
    ringkas: ringkasGarisWaktu(tahap, hariIni),
    adaJadwal: (jadwalRes.data ?? []).some((r) => r.mulai),
    tersimpan: (jadwalRes.data ?? []).length > 0,
    error: jadwalRes.error ?? null,
  };
}
