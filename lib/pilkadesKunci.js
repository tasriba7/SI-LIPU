// Aturan KUNCI tahapan Pilkades: satu sumber untuk menu samping, bilah langkah,
// dan gerbang di tiap halaman, supaya panitia tidak membuka tahap yang belum waktunya.
//
// Yang DIKUNCI hanya tahap yang bergantung pada pekerjaan sebelumnya.
// Yang TIDAK pernah dikunci (selalu bisa dibuka): Mulai di Sini, Jadwal Tahapan,
// 1. Ambil Data Warga, 3. Atur TPS, Calon Kepala Desa, Riwayat, dan Pengaturan Panitia
// (Periode, Susunan Panitia, Logo).
//
// Catatan: ini lapisan TAMPILAN. Penjaga utamanya tetap fungsi database
// (mis. "DPT hanya bisa ditetapkan setelah ada DPS", "Rekap suara belum lengkap").

import { ambilLangkah } from "@/lib/pilkades";

const H = "/dashboard/pilkades";

export const NAMA_TAHAP = {
  [`${H}/pemilih`]: "2. Periksa Pemilih",
  [`${H}/tempatkan`]: "4. Tempatkan Pemilih ke TPS",
  [`${H}/daftar`]: "5. Tetapkan DPS & DPT",
  [`${H}/cetak`]: "6. Cetak Daftar",
  [`${H}/tambahan`]: "Pemilih Tambahan",
  [`${H}/undangan`]: "Surat Undangan Memilih",
  [`${H}/hari-h`]: "Hari Pemungutan",
  [`${H}/hari-h/hadir`]: "Daftar Hadir",
  [`${H}/hari-h/hasil`]: "Hasil Suara & Berita Acara",
};

// Rantai syarat berurutan. Bila DPS/DPT sudah ditetapkan, semua syarat sebelumnya
// otomatis dianggap beres (daftar resmi tidak mungkin ada tanpa itu).
function daftarSyarat(s, calonDitetapkan) {
  const beres = s.adaDps || s.adaDpt;
  return {
    ambil: { ok: beres || s.total > 0, teks: "Data warga sudah diambil (Langkah 1)", href: `${H}/ambil`, label: "Ambil Data Warga" },
    periksa: { ok: beres || s.memenuhi > 0, teks: "Ada pemilih berstatus “Memenuhi syarat” (Langkah 2)", href: `${H}/pemilih`, label: "Periksa Pemilih" },
    tps: { ok: beres || s.jumlahTps > 0, teks: "TPS sudah dibuat (Langkah 3)", href: `${H}/tps`, label: "Atur TPS" },
    tempatkan: {
      ok: beres || (s.memenuhi > 0 && s.tanpaTps === 0),
      teks: "Semua pemilih sudah ditempatkan ke TPS (Langkah 4)",
      href: `${H}/tempatkan`,
      label: "Tempatkan Pemilih ke TPS",
    },
    dps: { ok: s.adaDps || s.adaDpt, teks: "DPS sudah ditetapkan (Langkah 5)", href: `${H}/daftar`, label: "Tetapkan DPS & DPT" },
    dpt: { ok: s.adaDpt, teks: "DPT sudah ditetapkan (Langkah 5)", href: `${H}/daftar`, label: "Tetapkan DPS & DPT" },
    calon: {
      ok: (calonDitetapkan ?? 0) > 0,
      teks: "Ada calon yang berstatus “Ditetapkan sebagai calon”",
      href: `${H}/calon`,
      label: "Calon Kepala Desa",
    },
  };
}

const RANTAI = ["ambil", "periksa", "tps", "tempatkan"];

// perlu  = syarat yang HARUS beres agar terbuka
// tampil = daftar syarat yang diperlihatkan di pesan (urut sesuai alur kerja)
const ATURAN = {
  [`${H}/pemilih`]: {
    perlu: ["ambil"],
    tampil: ["ambil"],
    pesan: "Belum ada data calon pemilih, jadi belum ada yang bisa diperiksa. Ambil data warga lebih dulu.",
  },
  [`${H}/tempatkan`]: {
    perlu: ["ambil", "periksa", "tps"],
    tampil: ["ambil", "periksa", "tps"],
    pesan: "Pemilih baru bisa ditempatkan ke TPS bila sudah ada pemilih yang memenuhi syarat dan TPS yang dibuat.",
  },
  [`${H}/daftar`]: {
    perlu: RANTAI,
    tampil: RANTAI,
    pesan: "DPS dan DPT hanya bisa ditetapkan setelah semua persiapan di bawah ini selesai. Daftar yang sudah ditetapkan tidak bisa diubah lagi, jadi pastikan datanya benar dulu.",
  },
  [`${H}/cetak`]: {
    perlu: ["ambil"],
    tampil: ["ambil"],
    pesan: "Belum ada data pemilih yang bisa dicetak. Ambil data warga lebih dulu.",
  },
  [`${H}/undangan`]: {
    perlu: ["dpt"],
    tampil: [...RANTAI, "dps", "dpt"],
    pesan: "Surat undangan dicetak dari DPT resmi, supaya nama dan nomor urutnya sama dengan daftar yang ditempel di papan pengumuman.",
  },
  [`${H}/tambahan`]: {
    perlu: ["dpt"],
    tampil: [...RANTAI, "dps", "dpt"],
    pesan: "Pemilih Tambahan dicatat setelah DPT ditetapkan, untuk warga yang berhak memilih tetapi terlewat dari DPT.",
  },
  [`${H}/hari-h/hadir`]: {
    perlu: ["dpt"],
    tampil: [...RANTAI, "dps", "dpt"],
    pesan: "Daftar hadir mengacu ke DPT resmi. Pencatatan hadir di TPS baru bisa dimulai setelah DPT ditetapkan.",
  },
  [`${H}/hari-h/hasil`]: {
    perlu: ["dpt", "calon"],
    tampil: [...RANTAI, "dps", "dpt", "calon"],
    pesan: "Rekap suara hanya bisa dicatat setelah DPT ditetapkan (untuk mencocokkan jumlah hadir) dan calon sudah ditetapkan.",
    butuhCalon: true,
  },
};

// Menu "Hari Pemungutan" (tab Daftar Hadir + Hasil Suara) terbuka begitu tab pertamanya
// (Daftar Hadir) terbuka. Tab "Hasil Suara" punya kunci sendiri yang lebih ketat.
ATURAN[`${H}/hari-h`] = {
  ...ATURAN[`${H}/hari-h/hadir`],
  pesan: "Hari Pemungutan (daftar hadir dan hasil suara) baru bisa dibuka setelah DPT ditetapkan. Daftar hadir mengacu ke DPT resmi.",
};

/**
 * Peta { href: kunci } hanya untuk tahap yang SEDANG terkunci.
 * `calonDitetapkan` = jumlah calon berstatus "ditetapkan"; null = tidak diketahui
 * (tahap "Hasil Suara" tidak dikunci bila angkanya tidak diketahui).
 * Hasilnya hanya berisi teks/angka biasa, aman dikirim ke komponen klien.
 */
export function hitungKunci(s, calonDitetapkan = null) {
  const syarat = daftarSyarat(s, calonDitetapkan);
  const hasil = {};
  for (const [href, a] of Object.entries(ATURAN)) {
    if (a.butuhCalon && calonDitetapkan === null) continue;
    if (a.perlu.every((k) => syarat[k].ok)) continue;

    const daftar = a.tampil.map((k) => ({ kunci: k, ...syarat[k] }));
    const pertama = daftar.find((d) => !d.ok);
    hasil[href] = {
      nama: NAMA_TAHAP[href],
      pesan: a.pesan,
      tambahan:
        s.adaDps && !s.adaDpt && a.perlu.includes("dpt")
          ? "DPS sudah ditetapkan. Cetak dan umumkan DPS (Langkah 6), beri waktu warga menanggapi, lalu tetapkan DPT."
          : null,
      syarat: daftar.map((d) => ({ ok: d.ok, teks: d.teks })),
      urutanPertama: daftar.findIndex((d) => !d.ok),
      aksi: pertama ? { href: pertama.href, label: `Kerjakan dulu: ${pertama.label}` } : null,
    };
  }
  return hasil;
}

/** Ambil data lalu hitung kunci untuk satu periode. Gagal baca = tidak ada yang dikunci. */
export async function ambilKunciPilkades(supabase, periode) {
  if (!periode) return {};
  try {
    const s = await ambilLangkah(supabase, periode);
    const { count, error } = await supabase
      .from("pilkades_calon")
      .select("id", { count: "exact", head: true })
      .eq("periode_id", periode.id)
      .eq("status", "ditetapkan");
    return hitungKunci(s, error ? null : (count ?? 0));
  } catch {
    return {};
  }
}

/** Kunci satu halaman (atau null bila terbuka). Dipakai sebagai gerbang di page.js. */
export async function kunciHalaman(supabase, periode, href) {
  const peta = await ambilKunciPilkades(supabase, periode);
  return peta[href] ?? null;
}
