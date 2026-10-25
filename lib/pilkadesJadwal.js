// Jadwal tahapan Pilkades: daftar tahapan, penghitungan status, dan pembacaan data.
// Logika murni (tanpa database) ada di bagian atas supaya mudah diuji.

/** Tahapan, berurutan. `data` = nama pemeriksa data otomatis (lihat ambilJadwalLengkap). */
export const TAHAPAN = [
  { kunci: "persiapan", nama: "Persiapan & Pembentukan Panitia", singkat: "Persiapan",
    arti: "Panitia dibentuk dan susunannya dicatat.", href: "/dashboard/pilkades/panitia" },
  { kunci: "daftar_pemilih", nama: "Penyusunan Daftar Pemilih", singkat: "Daftar pemilih",
    arti: "Data warga diambil, diperiksa, dan ditempatkan ke TPS.", href: "/dashboard/pilkades/ambil", data: "dps" },
  { kunci: "pengumuman_dps", nama: "Pengumuman DPS & Tanggapan Warga", singkat: "Pengumuman DPS",
    arti: "Daftar sementara ditempel agar warga memeriksa namanya.", href: "/dashboard/pilkades/cetak" },
  { kunci: "penetapan_dpt", nama: "Penetapan Daftar Pemilih Tetap (DPT)", singkat: "Penetapan DPT",
    arti: "Daftar final ditetapkan setelah tanggapan warga diperiksa.", href: "/dashboard/pilkades/daftar", data: "dpt" },
  { kunci: "pendaftaran_calon", nama: "Pendaftaran & Seleksi Calon", singkat: "Pendaftaran calon",
    arti: "Calon mendaftar dan berkasnya diperiksa.", href: "/dashboard/pilkades/calon" },
  { kunci: "penetapan_calon", nama: "Penetapan Calon & Nomor Urut", singkat: "Penetapan calon",
    arti: "Calon yang lolos ditetapkan dan diberi nomor urut.", href: "/dashboard/pilkades/calon", data: "calon" },
  { kunci: "kampanye", nama: "Masa Kampanye", singkat: "Kampanye",
    arti: "Calon menyampaikan visi dan misi kepada warga.", href: null },
  { kunci: "masa_tenang", nama: "Masa Tenang", singkat: "Masa tenang",
    arti: "Tidak ada kampanye menjelang hari pemungutan.", href: null },
  { kunci: "pemungutan", nama: "Pemungutan & Penghitungan Suara", singkat: "Pemungutan suara",
    arti: "Hari pencoblosan. Tanggalnya diatur Administrator di menu Periode.", href: "/dashboard/pilkades/hadir", tetap: true },
  { kunci: "penetapan_terpilih", nama: "Penetapan Calon Terpilih", singkat: "Calon terpilih",
    arti: "Hasil suara direkap dan calon terpilih ditetapkan.", href: "/dashboard/pilkades/hasil", data: "hasil" },
];

export const TAHAP_BISA_DIISI = TAHAPAN.filter((t) => !t.tetap);

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

/** Gabungkan jadwal tersimpan + data otomatis menjadi daftar tahapan siap tampil. */
export function bentukGarisWaktu({ jadwal, tanggalPemungutan, data = {}, hariIni }) {
  const peta = new Map((jadwal ?? []).map((j) => [j.tahap, j]));
  return TAHAPAN.map((t, i) => {
    const j = peta.get(t.kunci);
    const mulai = t.tetap ? tanggalPemungutan || null : j?.mulai ?? null;
    const selesai = t.tetap ? null : j?.selesai ?? null;
    const dikerjakan = t.data ? Boolean(data[t.data]) : null;
    return {
      ...t,
      no: i + 1,
      mulai,
      selesai,
      catatan: j?.catatan ?? "",
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
  const pemungutan = tahap.find((t) => t.kunci === "pemungutan");
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
      hasil.push(`“${ini.singkat}” dimulai (${formatRentang(ini.mulai)}) sebelum “${sebelum.singkat}” (${formatRentang(sebelum.mulai)}).`);
    }
  }
  return hasil;
}

/** Baca jadwal tersimpan + penanda "sudah dikerjakan" dari data yang ada. */
export async function ambilJadwalLengkap(supabase, periode, { arsip } = {}) {
  const [jadwalRes, calonRes, hasilRes, arsipRes] = await Promise.all([
    supabase.from("pilkades_jadwal").select("tahap, mulai, selesai, catatan").eq("periode_id", periode.id),
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
    ringkas: ringkasGarisWaktu(tahap, hariIni),
    adaJadwal: (jadwalRes.data ?? []).length > 0,
    error: jadwalRes.error ?? null,
  };
}
