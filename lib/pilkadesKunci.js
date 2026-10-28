// Aturan KUNCI tahapan Pilkades: satu sumber untuk menu samping, bilah langkah,
// dan gerbang di tiap halaman, supaya panitia tidak membuka tahap yang belum waktunya.
//
// Yang DIKUNCI hanya tahap yang bergantung pada pekerjaan sebelumnya.
// Yang TIDAK pernah dikunci (selalu bisa dibuka, karena dipakai untuk MENYIAPKAN): Mulai di Sini,
// Jadwal Tahapan, Calon Kepala Desa, Riwayat, dan Pengaturan (Periode, Susunan Panitia, Logo).
//
// SIAP = pengaturan + jadwal harus diisi dulu: tanggal pemungutan (Periode), Susunan Panitia,
// dan tanggal mulai tahap "Penyusunan Daftar Pemilih" (Jadwal Tahapan) yang sudah tiba.
// Tanpa itu, Ambil Data Warga, Periksa Pemilih, Atur TPS, Tempatkan ke TPS, dan seterusnya terkunci.
//
// Catatan: ini lapisan TAMPILAN. Penjaga utamanya tetap fungsi database
// (mis. "DPT hanya bisa ditetapkan setelah ada DPS", "Rekap suara belum lengkap").

import { ambilLangkah } from "@/lib/pilkades";
import { ambilBatasTahap, hitungTertunda, ambilKesiapan, alasanTertahan, NAMA_TAHAP_BAWAAN } from "@/lib/pilkadesTanggal";
import { formatRentang } from "@/lib/pilkadesJadwal";

const H = "/dashboard/pilkades";

export const NAMA_TAHAP = {
  [`${H}/ambil`]: "1. Ambil Data Warga",
  [`${H}/tps`]: "3. Atur TPS",
  [`${H}/pemilih`]: "2. Periksa Pemilih",
  [`${H}/tempatkan`]: "4. Tempatkan Pemilih ke TPS",
  [`${H}/daftar`]: "5. Tetapkan DPS & DPT",
  [`${H}/cetak`]: "6. Cetak Daftar",
  [`${H}/tambahan`]: "Pemilih Tambahan",
  [`${H}/undangan`]: "Surat Undangan Memilih",
  [`${H}/hari-h`]: "Hari Pemungutan",
  [`${H}/hari-h/hadir`]: "Cetak Daftar Hadir",
  [`${H}/hari-h/hasil`]: "Hasil Suara & Berita Acara",
};

// Rantai syarat berurutan. Bila DPS/DPT sudah ditetapkan, semua syarat sebelumnya
// otomatis dianggap beres (daftar resmi tidak mungkin ada tanpa itu).
function daftarSyarat(s, calonDitetapkan, kes = null) {
  const beres = s.adaDps || s.adaDpt;
  // Kesiapan tidak diketahui (kes null / gagal baca) = tidak menahan.
  const k = kes && !kes.gagal ? kes : null;
  const dps = k?.tahap?.dps;
  const namaDps = dps?.nama || NAMA_TAHAP_BAWAAN.dps;
  const tiba = Boolean(dps?.mulai) && Boolean(k) && k.hariIni >= dps.mulai;
  const siap = (ok) => beres || !k || Boolean(ok);
  return {
    periode: {
      ok: siap(k?.pemungutanDiisi),
      teks: "Tanggal pemungutan suara sudah diisi (menu Periode Pilkades, oleh Administrator)",
      href: `${H}/pengaturan/periode`,
      label: "Buka Periode Pilkades",
    },
    panitia: {
      ok: siap(k?.panitiaAda),
      teks: "Susunan Panitia sudah diisi",
      href: `${H}/pengaturan/panitia`,
      label: "Isi Susunan Panitia",
    },
    jadwal: {
      ok: siap(dps?.mulai),
      teks: `Jadwal tahap “${namaDps}” sudah diisi tanggal mulainya`,
      href: `${H}/jadwal`,
      label: "Isi Jadwal Tahapan",
    },
    mulai: {
      ok: siap(tiba),
      teks: dps?.mulai ? `Tanggal mulai tahap itu sudah tiba (${formatRentang(dps.mulai)})` : "Tanggal mulai tahap itu sudah tiba",
      href: `${H}/jadwal`,
      label: "Lihat Jadwal Tahapan",
    },
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

// Pengaturan + jadwal yang harus siap sebelum tahapan apa pun dijalankan.
const SIAP = ["periode", "panitia", "jadwal", "mulai"];
const RANTAI = [...SIAP, "ambil", "periksa", "tps", "tempatkan"];

// Pesan khusus bila yang belum beres adalah pengaturan/jadwal (bukan urutan kerja).
const PESAN_SIAP = {
  periode: "Pengaturan belum lengkap: tanggal pemungutan suara belum diisi. Hanya Administrator desa yang dapat mengisinya, di menu Periode Pilkades. Panitia harus menyiapkan pengaturan dan jadwal dulu sebelum tahapan dijalankan.",
  panitia: "Pengaturan belum lengkap: Susunan Panitia belum diisi. Panitia harus menyiapkan pengaturan dan jadwal dulu sebelum tahapan dijalankan.",
  jadwal: "Jadwal Tahapan belum diisi. Tentukan dulu tanggal mulai tiap tahap; tahapan hanya bisa dijalankan sesuai jadwal.",
};

// perlu  = syarat yang HARUS beres agar terbuka
// tampil = daftar syarat yang diperlihatkan di pesan (urut sesuai alur kerja)
const ATURAN = {
  [`${H}/ambil`]: {
    perlu: SIAP,
    tampil: SIAP,
    pesan: "Data warga baru bisa diambil setelah panitia menyiapkan pengaturan dan jadwal, dan tanggal mulai tahap penyusunan daftar pemilih sudah tiba.",
  },
  [`${H}/tps`]: {
    perlu: SIAP,
    tampil: SIAP,
    pesan: "TPS baru bisa diatur setelah panitia menyiapkan pengaturan dan jadwal, dan tanggal mulai tahap penyusunan daftar pemilih sudah tiba.",
  },
  [`${H}/pemilih`]: {
    perlu: [...SIAP, "ambil"],
    tampil: [...SIAP, "ambil"],
    pesan: "Belum ada data calon pemilih, jadi belum ada yang bisa diperiksa. Ambil data warga lebih dulu.",
  },
  [`${H}/tempatkan`]: {
    perlu: [...SIAP, "ambil", "periksa", "tps"],
    tampil: [...SIAP, "ambil", "periksa", "tps"],
    pesan: "Pemilih baru bisa ditempatkan ke TPS bila sudah ada pemilih yang memenuhi syarat dan TPS yang dibuat.",
  },
  [`${H}/daftar`]: {
    perlu: RANTAI,
    tampil: RANTAI,
    pesan: "DPS dan DPT hanya bisa ditetapkan setelah semua persiapan di bawah ini selesai. Daftar yang sudah ditetapkan tidak bisa diubah lagi, jadi pastikan datanya benar dulu.",
  },
  [`${H}/cetak`]: {
    perlu: [...SIAP, "ambil"],
    tampil: [...SIAP, "ambil"],
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
    pesan: "Daftar hadir dicetak dari DPT resmi (ditambah Pemilih Tambahan), jadi baru bisa dicetak setelah DPT ditetapkan.",
  },
  [`${H}/hari-h/hasil`]: {
    perlu: ["dpt", "calon"],
    tampil: [...RANTAI, "dps", "dpt", "calon"],
    pesan: "Rekap angka TPS hanya bisa dicatat setelah DPT ditetapkan (untuk mencocokkan jumlah hadir dengan pemilih terdaftar) dan calon sudah ditetapkan.",
    butuhCalon: true,
    tanggal: "pemungutan", // tambahan: tanggal hari pemungutan (menu Periode) harus sudah tiba
  },
};

// Menu "Hari Pemungutan" (tab Daftar Hadir + Hasil Suara) terbuka begitu tab pertamanya
// (Daftar Hadir) terbuka. Tab "Hasil Suara" punya kunci sendiri yang lebih ketat.
ATURAN[`${H}/hari-h`] = {
  ...ATURAN[`${H}/hari-h/hadir`],
  pesan: "Hari Pemungutan (cetak daftar hadir dan hasil suara) baru bisa dibuka setelah DPT ditetapkan. Daftar hadir mengacu ke DPT resmi.",
};

/**
 * Peta { href: kunci } hanya untuk tahap yang SEDANG terkunci.
 * `calonDitetapkan` = jumlah calon berstatus "ditetapkan"; null = tidak diketahui
 * (tahap "Hasil Suara" tidak dikunci bila angkanya tidak diketahui).
 * Hasilnya hanya berisi teks/angka biasa, aman dikirim ke komponen klien.
 */
export function hitungKunci(s, calonDitetapkan = null, tertunda = {}, kes = null) {
  const syarat = daftarSyarat(s, calonDitetapkan, kes);
  const hasil = {};
  for (const [href, a] of Object.entries(ATURAN)) {
    if (a.butuhCalon && calonDitetapkan === null) continue;
    // Penjaga TANGGAL: tahap juga tertutup sampai tanggal mulainya tiba (Jadwal Tahapan / Periode).
    const tunda = a.tanggal ? tertunda[a.tanggal] : null;
    if (a.perlu.every((k) => syarat[k].ok) && !tunda) continue;

    const daftar = a.tampil.map((k) => ({ kunci: k, ...syarat[k] }));
    if (tunda) {
      daftar.push({
        kunci: "tanggal",
        ok: false,
        teks: `Tanggal pemungutan suara sudah tiba (${formatRentang(tunda.mulai)})`,
        href: `${H}/jadwal`,
        label: "Lihat Jadwal Tahapan",
      });
    }
    const pertama = daftar.find((d) => !d.ok);
    // Bila yang belum beres adalah pengaturan/jadwal, tampilkan pesan yang relevan untuk itu.
    let pesanKunci = tunda && a.perlu.every((k) => syarat[k].ok) ? tunda.pesan : a.pesan;
    if (pertama && SIAP.includes(pertama.kunci)) {
      pesanKunci =
        pertama.kunci === "mulai"
          ? (alasanTertahan(kes, "dps")?.pesan ?? a.pesan)
          : PESAN_SIAP[pertama.kunci] ?? a.pesan;
    }
    hasil[href] = {
      nama: NAMA_TAHAP[href],
      pesan: pesanKunci,
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
    const tertunda = hitungTertunda(await ambilBatasTahap(supabase, periode.id, periode.tanggal_pemungutan ?? null));
    const kes = await ambilKesiapan(supabase, periode.id, periode.tanggal_pemungutan ?? null);
    return hitungKunci(s, error ? null : (count ?? 0), tertunda, kes);
  } catch {
    return {};
  }
}

/** Kunci satu halaman (atau null bila terbuka). Dipakai sebagai gerbang di page.js. */
export async function kunciHalaman(supabase, periode, href) {
  const peta = await ambilKunciPilkades(supabase, periode);
  return peta[href] ?? null;
}
