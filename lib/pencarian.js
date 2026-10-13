import { labelKategoriBerita, tanggalIndo } from "@/lib/berita";
import { labelKategori as labelKategoriWisata } from "@/lib/wisata";

// Pencarian di seluruh situs publik: berita, pengumuman, layanan, wisata, profil
// desa, dan halaman-halaman situs. Hanya membaca data yang MEMANG sudah publik
// (RLS tetap berlaku: berita terbit, layanan & wisata aktif, profil desa).
//
// KEAMANAN: kata kunci dari pengunjung disusun ke filter PostgREST (.or) dan
// pola ILIKE, jadi dibersihkan dulu — hanya huruf, angka, spasi, titik, dan
// strip yang lolos. Karakter berbahaya (koma, kurung, %, _, *, kutip, dll.)
// dibuang, sehingga kata kunci tidak bisa menyisipkan filter lain atau
// memperluas pola pencarian.
//
// "Pengumuman" = berita berkategori Pengumuman (sudah ada di KATEGORI_BERITA),
// ditampilkan sebagai kelompok tersendiri.

export const MIN_HURUF = 2;
const MAKS_PANJANG = 60;
const MAKS_KATA = 5;
const BATAS_PER_KELOMPOK = 8;

/** Bersihkan teks mentah dari kotak cari -> string aman ("" bila tidak layak). */
export function bersihkanKataKunci(mentah) {
  if (typeof mentah !== "string") return "";
  return mentah
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s.\-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAKS_PANJANG)
    .trim();
}

/** Pecah jadi kata (maks. MAKS_KATA); kata sependek 1 huruf diabaikan. */
export function pecahKata(bersih) {
  return bersih
    .split(" ")
    .filter((k) => k.length >= 1)
    .slice(0, MAKS_KATA);
}

// Halaman-halaman situs yang bisa dicari lewat namanya / kata kunci terkait.
// Menambah halaman baru? Cukup tambahkan satu baris di sini.
const HALAMAN_SITUS = [
  { judul: "Profil Desa", href: "/profil", ket: "Sejarah, visi dan misi, serta wilayah desa", kunci: "profil sejarah visi misi wilayah batas luas tentang desa" },
  { judul: "Struktur Organisasi", href: "/struktur-organisasi", ket: "Bagan perangkat desa beserta jabatannya", kunci: "struktur organisasi perangkat kepala desa sekretaris kaur kasi kadus bpd bagan jabatan" },
  { judul: "Galeri Kegiatan", href: "/galeri", ket: "Foto kegiatan dan acara desa", kunci: "galeri foto kegiatan acara dokumentasi gambar" },
  { judul: "APBDes", href: "/apbdes", ket: "Transparansi anggaran pendapatan dan belanja desa", kunci: "apbdes anggaran dana pendapatan belanja transparansi keuangan" },
  { judul: "Cuaca & Gempa", href: "/cuaca", ket: "Prakiraan cuaca dan gempa terkini dari BMKG", kunci: "cuaca gempa bmkg hujan prakiraan suhu" },
  { judul: "Berita Desa", href: "/berita", ket: "Berita dan kabar terbaru desa", kunci: "berita kabar informasi terbaru" },
  { judul: "Wisata Desa", href: "/wisata", ket: "Destinasi wisata desa", kunci: "wisata destinasi tempat rekreasi" },
  { judul: "Panel Warga", href: "/layanan", ket: "Ajukan layanan, cek status, dan riwayat pengajuan", kunci: "layanan panel warga ajukan surat pengaduan" },
  { judul: "Cek Status Pengajuan", href: "/layanan/cek", ket: "Lihat perkembangan pengajuan dengan kode tracking", kunci: "cek status pengajuan kode tracking lacak" },
  { judul: "Riwayat Pengajuan", href: "/layanan/riwayat", ket: "Daftar pengajuan Anda sebelumnya", kunci: "riwayat pengajuan sebelumnya" },
  { judul: "Pendaftaran", href: "/pendaftaran", ket: "Pendaftaran akun perangkat desa", kunci: "pendaftaran daftar akun perangkat ketua rt kadus" },
];

function cocokSemua(teks, kataKecil) {
  const t = (teks || "").toLowerCase();
  return kataKecil.every((k) => t.includes(k));
}

/** Potong cuplikan (+-80 huruf) di sekitar kata pertama yang ditemukan. */
export function buatCuplikan(teks, kata, panjang = 160) {
  const bersih = (teks || "").replace(/\s+/g, " ").trim();
  if (!bersih) return "";
  const kecil = bersih.toLowerCase();
  let pos = -1;
  for (const k of kata) {
    const i = kecil.indexOf(k.toLowerCase());
    if (i !== -1 && (pos === -1 || i < pos)) pos = i;
  }
  if (pos === -1) pos = 0;
  const awal = Math.max(0, pos - Math.floor(panjang / 3));
  const akhir = Math.min(bersih.length, awal + panjang);
  return `${awal > 0 ? "…" : ""}${bersih.slice(awal, akhir).trim()}${akhir < bersih.length ? "…" : ""}`;
}

function atau(kolom, kata) {
  // `kata` sudah dibersihkan (hanya huruf/angka/titik/strip) -> aman disusun.
  return kolom.map((c) => `${c}.ilike.%${kata}%`).join(",");
}

async function aman(janji, cadangan = []) {
  try {
    const hasil = await janji;
    if (hasil?.error) return cadangan;
    return hasil?.data ?? cadangan;
  } catch {
    return cadangan;
  }
}

/**
 * Jalankan pencarian. Mengembalikan:
 * { q, kata, terlaluPendek, pengumuman, berita, layanan, wisata, profil, halaman, total }
 */
export async function cariSitus(supabase, mentah) {
  const q = bersihkanKataKunci(mentah);
  const kata = pecahKata(q);
  const kosong = {
    q,
    kata,
    terlaluPendek: false,
    pengumuman: [],
    berita: [],
    layanan: [],
    wisata: [],
    profil: [],
    halaman: [],
    total: 0,
  };
  if (q.length === 0) return kosong;
  // Harus ada minimal MIN_HURUF karakter dan setidaknya satu huruf/angka
  // (kata kunci ".." atau "--" akan cocok dengan hampir semua baris).
  const hurufAngka = (q.match(/[\p{L}\p{N}]/gu) || []).length;
  if (q.length < MIN_HURUF || hurufAngka < MIN_HURUF) return { ...kosong, terlaluPendek: true };

  const kecil = kata.map((k) => k.toLowerCase());

  // Tiap kata HARUS ada (AND); di dalam satu kata boleh cocok di kolom mana pun (OR).
  const saringBerita = kata.reduce(
    (qb, k) => qb.or(atau(["judul", "ringkasan", "isi"], k)),
    supabase
      .from("berita")
      .select("id, judul, ringkasan, kategori, tanggal_terbit")
      .eq("terbit", true)
      .order("tanggal_terbit", { ascending: false })
      .limit(30),
  );
  const saringLayanan = kata.reduce(
    (qb, k) => qb.or(atau(["nama_layanan", "deskripsi"], k)),
    supabase
      .from("jenis_layanan_master")
      .select("id, nama_layanan, kategori, deskripsi")
      .eq("aktif", true)
      .limit(BATAS_PER_KELOMPOK),
  );
  const saringWisata = kata.reduce(
    (qb, k) => qb.or(atau(["nama", "deskripsi", "lokasi"], k)),
    supabase
      .from("wisata")
      .select("id, nama, kategori, lokasi, deskripsi")
      .eq("aktif", true)
      .limit(BATAS_PER_KELOMPOK),
  );
  const ambilProfil = supabase
    .from("config_desa")
    .select(
      "profil_sejarah, profil_visi, profil_misi, batas_utara, batas_selatan, batas_timur, batas_barat, luas_wilayah",
    )
    .eq("id", 1)
    .maybeSingle();

  const [beritaSemua, layananRaw, wisataRaw, profilRaw] = await Promise.all([
    aman(saringBerita),
    aman(saringLayanan),
    aman(saringWisata),
    aman(ambilProfil, null),
  ]);

  const itemBerita = beritaSemua.map((b) => ({
    id: b.id,
    judul: b.judul,
    href: `/berita/${b.id}`,
    cuplikan: buatCuplikan(b.ringkasan, kata),
    meta: [labelKategoriBerita(b.kategori), b.tanggal_terbit ? tanggalIndo(b.tanggal_terbit) : null]
      .filter(Boolean)
      .join(" · "),
    kategori: b.kategori,
  }));
  const pengumuman = itemBerita.filter((b) => b.kategori === "pengumuman").slice(0, BATAS_PER_KELOMPOK);
  const berita = itemBerita.filter((b) => b.kategori !== "pengumuman").slice(0, BATAS_PER_KELOMPOK);

  const layanan = (layananRaw || []).map((l) => ({
    id: l.id,
    judul: l.nama_layanan,
    href: `/layanan/ajukan/${l.id}`,
    cuplikan: buatCuplikan(l.deskripsi, kata),
    meta: l.kategori === "pengaduan" ? "Pengaduan" : "Layanan",
  }));

  const wisata = (wisataRaw || []).map((w) => ({
    id: w.id,
    judul: w.nama,
    href: `/wisata/${w.id}`,
    cuplikan: buatCuplikan(w.deskripsi, kata),
    meta: [labelKategoriWisata(w.kategori), w.lokasi].filter(Boolean).join(" · "),
  }));

  // Profil desa: cocokkan per bagian di sisi server (teks panjang, jadi tidak
  // perlu ILIKE di database).
  const profil = [];
  if (profilRaw) {
    const bagian = [
      { judul: "Sejarah Desa", teks: profilRaw.profil_sejarah },
      { judul: "Visi Desa", teks: profilRaw.profil_visi },
      { judul: "Misi Desa", teks: profilRaw.profil_misi },
      {
        judul: "Batas & Luas Wilayah",
        teks: [
          profilRaw.batas_utara && `Utara: ${profilRaw.batas_utara}`,
          profilRaw.batas_selatan && `Selatan: ${profilRaw.batas_selatan}`,
          profilRaw.batas_timur && `Timur: ${profilRaw.batas_timur}`,
          profilRaw.batas_barat && `Barat: ${profilRaw.batas_barat}`,
          profilRaw.luas_wilayah && `Luas: ${profilRaw.luas_wilayah}`,
        ]
          .filter(Boolean)
          .join(". "),
      },
    ];
    for (const b of bagian) {
      if (b.teks && cocokSemua(b.teks, kecil)) {
        profil.push({
          judul: b.judul,
          href: "/profil",
          cuplikan: buatCuplikan(b.teks, kata),
          meta: "Profil Desa",
        });
      }
    }
  }

  const halaman = HALAMAN_SITUS.filter((h) => cocokSemua(`${h.judul} ${h.kunci}`, kecil)).map((h) => ({
    judul: h.judul,
    href: h.href,
    cuplikan: h.ket,
    meta: "Halaman",
  }));

  const total =
    pengumuman.length + berita.length + layanan.length + wisata.length + profil.length + halaman.length;

  return { ...kosong, pengumuman, berita, layanan, wisata, profil, halaman, total };
}
