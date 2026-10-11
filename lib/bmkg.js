// Lapisan data BMKG (Badan Meteorologi, Klimatologi, dan Geofisika).
//
// Memakai DATA TERBUKA BMKG: tidak perlu API key, cukup dipanggil langsung.
// Dua ketentuan dari BMKG yang WAJIB dipatuhi:
//   1. Mencantumkan BMKG sebagai sumber data (lihat <AtribusiBmkg /> di
//      components/BmkgKomponen.jsx — jangan dihapus dari halaman yang memakai data ini).
//   2. Maksimal 60 permintaan per menit per IP. Karena itu semua panggilan
//      di bawah di-cache lewat cache fetch Next.js (`next.revalidate`), jadi
//      berapa pun warga membuka halaman, BMKG hanya dihubungi sesekali.
//
// Semua fungsi `get...` TIDAK PERNAH melempar error: kalau BMKG sedang
// gangguan, hasilnya status "tidak_tersedia" / null dan halaman tetap tampil.
//
// Kode wilayah desa (kode Kemendagri tingkat IV, mis. 72.03.01.2001) TIDAK
// disimpan di database (tidak ada migrasi). Ditentukan dengan urutan:
//   1. Variabel lingkungan BMKG_KODE_ADM4 bila diisi (paling pasti), atau
//   2. dicari otomatis dari isian Pengaturan Desa (provinsi, kabupaten,
//      kecamatan, nama desa) lewat wilayah.id — API yang sama dengan form
//      Pengaturan Desa — lalu hasilnya di-cache.

export const SUMBER_BMKG = {
  nama: "BMKG",
  namaLengkap: "Badan Meteorologi, Klimatologi, dan Geofisika",
  url: "https://www.bmkg.go.id",
};

const URL_CUACA = "https://api.bmkg.go.id/publik/prakiraan-cuaca";
const URL_GEMPA = "https://data.bmkg.go.id/DataMKG/TEWS";
const URL_WILAYAH = "https://wilayah.id/api";
const URL_SHAKEMAP = "https://static.bmkg.go.id";

const POLA_ADM4 = /^\d{2}\.\d{2}\.\d{2}\.\d{4}$/;

// Lama cache (detik). Cuaca: BMKG memperbarui prakiraan beberapa kali sehari.
// Gempa: dibuat pendek supaya info baru cepat tampil, tetap jauh di bawah 60/menit.
const CACHE_CUACA = 30 * 60;
const CACHE_GEMPA = 2 * 60;
const CACHE_WILAYAH = 7 * 24 * 60 * 60;
const BATAS_WAKTU_MS = 6000;

// ---------------------------------------------------------------- umum

async function ambilJson(url, revalidate) {
  try {
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      next: { revalidate },
      signal: AbortSignal.timeout(BATAS_WAKTU_MS),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function angka(nilai) {
  if (nilai === null || nilai === undefined || nilai === "") return null;
  const n = Number(String(nilai).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// Hanya terima gambar/ikon dari domain resmi BMKG lewat HTTPS.
function urlBmkgAman(url) {
  try {
    const u = new URL(String(url));
    if (u.protocol !== "https:") return null;
    return u.hostname === "bmkg.go.id" || u.hostname.endsWith(".bmkg.go.id") ? u.href : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------- kode wilayah desa

const AWALAN_WILAYAH = /^(kabupaten|kab|kota|kecamatan|kec|desa|kelurahan|kel|provinsi|prov)\.?\s+/i;

function normNama(teks) {
  return String(teks ?? "")
    .toLowerCase()
    .replace(AWALAN_WILAYAH, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function daftarWilayah(jalur) {
  const data = await ambilJson(`${URL_WILAYAH}/${jalur}.json`, CACHE_WILAYAH);
  return Array.isArray(data?.data) ? data.data : [];
}

// Cocokkan nama isian ke daftar wilayah.id. Bila ada beberapa yang namanya
// sama (mis. "Kabupaten Bandung" vs "Kota Bandung"), pilih yang jenisnya sama.
function cocokkanNama(daftar, nama) {
  const target = normNama(nama);
  if (!target) return null;
  const kandidat = daftar.filter((w) => normNama(w.name) === target);
  if (kandidat.length <= 1) return kandidat[0] ?? null;
  const adalahKota = /^\s*kota\b/i.test(String(nama));
  return (
    kandidat.find((w) => /^\s*kota\b/i.test(String(w.name)) === adalahKota) ?? kandidat[0]
  );
}

const ingatanKode = new Map();

async function cariKodeLewatNama(config) {
  const { provinsi, kabupaten, kecamatan, nama_desa: namaDesa } = config ?? {};
  if (!provinsi || !kabupaten || !kecamatan || !namaDesa) return null;

  const kunci = [provinsi, kabupaten, kecamatan, namaDesa].map(normNama).join("|");
  if (ingatanKode.has(kunci)) return ingatanKode.get(kunci);

  const prov = cocokkanNama(await daftarWilayah("provinces"), provinsi);
  if (!prov) return null;
  const kab = cocokkanNama(await daftarWilayah(`regencies/${prov.code}`), kabupaten);
  if (!kab) return null;
  const kec = cocokkanNama(await daftarWilayah(`districts/${kab.code}`), kecamatan);
  if (!kec) return null;
  const desa = cocokkanNama(await daftarWilayah(`villages/${kec.code}`), namaDesa);
  const kode = desa && POLA_ADM4.test(String(desa.code)) ? String(desa.code) : null;

  // Hanya diingat kalau berhasil, supaya gangguan sesaat tidak "menempel".
  if (kode) ingatanKode.set(kunci, kode);
  return kode;
}

/**
 * Kode wilayah tingkat IV (adm4) untuk desa ini, atau null kalau belum bisa ditentukan.
 * @param {object} config hasil getConfigDesa()
 * @returns {Promise<{ kode: string, sumber: "env" | "otomatis" } | null>}
 */
export async function getKodeWilayahBmkg(config) {
  const dariEnv = String(process.env.BMKG_KODE_ADM4 ?? "").trim();
  if (POLA_ADM4.test(dariEnv)) return { kode: dariEnv, sumber: "env" };

  try {
    const kode = await cariKodeLewatNama(config);
    return kode ? { kode, sumber: "otomatis" } : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- cuaca

const ZONA_WAKTU = [
  { cocok: /(0700|jakarta|wib)/i, label: "WIB", iana: "Asia/Jakarta" },
  { cocok: /(0800|makassar|wita)/i, label: "WITA", iana: "Asia/Makassar" },
  { cocok: /(0900|jayapura|wit\b)/i, label: "WIT", iana: "Asia/Jayapura" },
];

function zonaDari(teks) {
  return ZONA_WAKTU.find((z) => z.cocok.test(String(teks ?? ""))) ?? null;
}

function ubahItemCuaca(x) {
  const waktuLokal = String(x?.local_datetime ?? "").trim();
  if (!waktuLokal) return null;
  return {
    waktuLokal, // "2026-10-11 14:00:00"
    waktuUtc: String(x?.utc_datetime ?? "").trim(),
    tanggal: waktuLokal.slice(0, 10),
    jam: waktuLokal.slice(11, 16),
    suhu: angka(x?.t),
    lembap: angka(x?.hu),
    awan: angka(x?.tcc),
    curah: angka(x?.tp),
    kondisi: String(x?.weather_desc ?? "").trim(),
    kecepatanAngin: angka(x?.ws),
    arahAngin: String(x?.wd ?? "").trim(),
    jarakPandang: String(x?.vs_text ?? "").trim(),
    ikon: urlBmkgAman(x?.image),
  };
}

function waktuUtcKeMs(teks) {
  if (!teks) return NaN;
  return Date.parse(`${teks.replace(" ", "T")}Z`);
}

// Slot prakiraan (per 3 jam) yang paling dekat dengan waktu sekarang.
function pilihSlotSekarang(daftar) {
  const sekarang = Date.now();
  let terbaik = null;
  let selisihTerbaik = Infinity;
  for (const s of daftar) {
    const ms = waktuUtcKeMs(s.waktuUtc);
    if (Number.isNaN(ms)) continue;
    const selisih = Math.abs(ms - sekarang);
    if (selisih < selisihTerbaik) {
      terbaik = s;
      selisihTerbaik = selisih;
    }
  }
  return terbaik ?? daftar[0] ?? null;
}

function ubahCuaca(json) {
  const bagianData = Array.isArray(json?.data) ? json.data[0] : null;
  const lokasi = json?.lokasi ?? bagianData?.lokasi ?? {};
  const blok = bagianData?.cuaca;
  if (!Array.isArray(blok)) return null;

  const semuaSlot = blok
    .flat()
    .map(ubahItemCuaca)
    .filter(Boolean)
    .sort((a, b) => a.waktuLokal.localeCompare(b.waktuLokal));
  if (semuaSlot.length === 0) return null;

  const perHariPeta = new Map();
  for (const s of semuaSlot) {
    if (!perHariPeta.has(s.tanggal)) perHariPeta.set(s.tanggal, []);
    perHariPeta.get(s.tanggal).push(s);
  }
  const perHari = [...perHariPeta.entries()].map(([tanggal, slot]) => {
    const suhu = slot.map((s) => s.suhu).filter((n) => n !== null);
    return {
      tanggal,
      slot,
      suhuMin: suhu.length ? Math.min(...suhu) : null,
      suhuMax: suhu.length ? Math.max(...suhu) : null,
    };
  });

  const sekarang = pilihSlotSekarang(semuaSlot);
  const zona = zonaDari(lokasi.timezone);
  const mendatang = semuaSlot
    .filter((s) => s.waktuLokal > (sekarang?.waktuLokal ?? ""))
    .slice(0, 4);

  return {
    lokasi: {
      desa: String(lokasi.desa ?? "").trim(),
      kecamatan: String(lokasi.kecamatan ?? "").trim(),
      kabupatenKota: String(lokasi.kotkab ?? "").trim(),
      provinsi: String(lokasi.provinsi ?? lokasi.provsi ?? "").trim(),
      lat: angka(lokasi.lat),
      lon: angka(lokasi.lon),
      zona: zona?.label ?? "",
      zonaIana: zona?.iana ?? null,
    },
    sekarang,
    mendatang,
    perHari,
  };
}

/**
 * Prakiraan cuaca untuk desa ini (± 3 hari, per 3 jam).
 * @returns {Promise<
 *   | { status: "ok", sumber: "env" | "otomatis", kode: string,
 *       lokasi: object, sekarang: object | null, mendatang: object[], perHari: object[] }
 *   | { status: "belum_diatur" }
 *   | { status: "tidak_tersedia" }
 * >}
 */
export async function getCuacaDesa(config) {
  const wilayah = await getKodeWilayahBmkg(config);
  if (!wilayah) return { status: "belum_diatur" };

  const json = await ambilJson(
    `${URL_CUACA}?adm4=${encodeURIComponent(wilayah.kode)}`,
    CACHE_CUACA
  );
  const cuaca = json ? ubahCuaca(json) : null;
  if (!cuaca) return { status: "tidak_tersedia" };

  return { status: "ok", sumber: wilayah.sumber, kode: wilayah.kode, ...cuaca };
}

// ---------------------------------------------------------------- gempa

function ubahGempa(g) {
  if (!g || typeof g !== "object") return null;
  const [lat, lon] = String(g.Coordinates ?? "")
    .split(",")
    .map((n) => angka(n));
  const berkasPeta = String(g.Shakemap ?? "").trim();
  return {
    id: String(g.DateTime || `${g.Tanggal ?? ""} ${g.Jam ?? ""}`).trim(),
    tanggal: String(g.Tanggal ?? "").trim(), // "09 Okt 2026"
    jam: String(g.Jam ?? "").trim(), // "17:34:55 WIB"
    waktuIso: String(g.DateTime ?? "").trim(),
    magnitude: angka(g.Magnitude),
    kedalaman: String(g.Kedalaman ?? "").trim(),
    lintang: String(g.Lintang ?? "").trim(),
    bujur: String(g.Bujur ?? "").trim(),
    lat: lat ?? null,
    lon: lon ?? null,
    wilayah: String(g.Wilayah ?? "").trim(),
    potensi: String(g.Potensi ?? "").trim(),
    dirasakan: String(g.Dirasakan ?? "").trim(),
    petaGuncangan: /^[\w.-]+\.(jpe?g|png)$/i.test(berkasPeta)
      ? `${URL_SHAKEMAP}/${berkasPeta}`
      : null,
  };
}

async function ambilDaftarGempa(berkas) {
  const json = await ambilJson(`${URL_GEMPA}/${berkas}.json`, CACHE_GEMPA);
  const gempa = json?.Infogempa?.gempa;
  const daftar = Array.isArray(gempa) ? gempa : gempa ? [gempa] : [];
  return daftar.map(ubahGempa).filter((g) => g && g.wilayah);
}

/** Gempa bumi terbaru yang tercatat BMKG (satu kejadian) atau null. */
export async function getGempaTerbaru() {
  return (await ambilDaftarGempa("autogempa"))[0] ?? null;
}

/** 15 gempa bumi terakhir dengan magnitudo 5,0 atau lebih. */
export async function getGempaM5() {
  return ambilDaftarGempa("gempaterkini");
}

/** 15 gempa bumi terakhir yang dirasakan masyarakat. */
export async function getGempaDirasakan() {
  return ambilDaftarGempa("gempadirasakan");
}

/** Ketiga data gempa sekaligus (paralel). Yang gagal diambil menjadi null / []. */
export async function getDataGempa() {
  const [terbaru, m5, dirasakan] = await Promise.all([
    getGempaTerbaru(),
    getGempaM5(),
    getGempaDirasakan(),
  ]);
  return { terbaru, m5, dirasakan };
}

// ------------------------------------------------------- bantuan tampilan

/** Jarak garis lurus (km) antara dua titik, atau null kalau salah satunya kosong. */
export function jarakKm(lat1, lon1, lat2, lon2) {
  if ([lat1, lon1, lat2, lon2].some((n) => typeof n !== "number" || !Number.isFinite(n))) {
    return null;
  }
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(6371 * 2 * Math.asin(Math.sqrt(a)));
}

/** "2026-10-11" -> "Minggu, 11 Oktober". */
export function formatHariTanggal(tanggalIso) {
  const d = new Date(`${tanggalIso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return tanggalIso;
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(d);
}

/** Tingkat kewaspadaan dari magnitudo, dipakai untuk warna lencana. */
export function tingkatGempa(magnitude) {
  if (magnitude === null || magnitude === undefined) return "rendah";
  if (magnitude >= 6) return "tinggi";
  if (magnitude >= 5) return "sedang";
  return "rendah";
}

/** Emoji cadangan bila ikon resmi BMKG tidak ada. */
export function emojiCuaca(kondisi) {
  const k = String(kondisi ?? "").toLowerCase();
  if (k.includes("petir")) return "⛈️";
  if (k.includes("hujan")) return "🌧️";
  if (k.includes("kabut") || k.includes("asap")) return "🌫️";
  if (k.includes("berawan") && !k.includes("cerah")) return "☁️";
  if (k.includes("cerah berawan")) return "⛅";
  if (k.includes("cerah")) return "☀️";
  return "🌤️";
}
