// Konstanta & helper modul Pilkades (tahap 1).

export const STATUS_VERIFIKASI = {
  belum: "Belum diperiksa",
  memenuhi_syarat: "Memenuhi syarat",
  tidak_memenuhi: "Tidak memenuhi syarat",
  perlu_dicek: "Perlu dicek",
};

export const STATUS_BADGE_CLASS = {
  belum: "bg-slate-100 text-slate-600",
  memenuhi_syarat: "bg-emerald-100 text-emerald-700",
  tidak_memenuhi: "bg-red-100 text-red-700",
  perlu_dicek: "bg-amber-100 text-amber-700",
};

/** Periode aktif (kalau tidak ada: periode terbaru). */
export async function ambilPeriode(supabase) {
  const { data } = await supabase
    .from("pilkades_periode")
    .select("id, nama, tanggal_pemungutan, aktif, usia_minimum, termasuk_pernah_kawin")
    .order("aktif", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

/** Umur (tahun penuh) pada tanggal acuan. */
export function hitungUmur(tanggalLahir, acuan = new Date()) {
  if (!tanggalLahir) return null;
  const l = new Date(tanggalLahir);
  let umur = acuan.getFullYear() - l.getFullYear();
  const belumUlangTahun =
    acuan.getMonth() < l.getMonth() ||
    (acuan.getMonth() === l.getMonth() && acuan.getDate() < l.getDate());
  if (belumUlangTahun) umur -= 1;
  return umur;
}

/**
 * Calon pemilih yang usianya di bawah batas periode (usia_minimum) pada tanggal
 * acuan TIDAK ditampilkan/dicetak, dari usia hampir cukup sampai 0 tahun.
 * Pengecualian: yang sudah berstatus "Memenuhi syarat" (mis. lolos lewat aturan kawin).
 */
export function terlaluMuda(r, periode, acuan) {
  const umur = hitungUmur(r.tanggal_lahir, acuan);
  if (umur === null) return false;
  return umur < (periode.usia_minimum ?? 17) && r.status_verifikasi !== "memenuhi_syarat";
}

export function formatTanggal(t) {
  if (!t) return "-";
  return new Date(t).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export const JENIS_DAFTAR_LABEL = {
  DPS: "Daftar Pemilih Sementara (DPS)",
  DPT: "Daftar Pemilih Tetap (DPT)",
};

export const AKSI_LABEL = {
  ambil_calon_pemilih: "Ambil calon pemilih",
  tetapkan_dps: "Tetapkan DPS",
  tetapkan_dpt: "Tetapkan DPT",
  terapkan_filter_usia: "Terapkan filter usia",
  cetak_draf: "Cetak draf",
  cetak_arsip: "Cetak daftar resmi",
  ubah_panitia: "Ubah susunan panitia",
  hapus_panitia: "Hapus dari susunan panitia",
  ubah_calon: "Ubah data calon",
  hapus_calon: "Hapus calon",
  batal_hadir: "Batalkan catatan hadir",
  simpan_suara: "Simpan rekap suara TPS",
  tetapkan_terpilih: "Tetapkan calon terpilih",
  batal_penetapan: "Batalkan penetapan calon terpilih",
  cetak_berita_acara: "Cetak berita acara hasil",
  ubah_logo: "Ubah logo panitia",
  cetak_undangan: "Cetak surat undangan memilih",
  ubah_jadwal: "Ubah jadwal tahapan",
  cetak_hadir: "Cetak daftar hadir pemilih",
  cetak_jadwal: "Cetak jadwal tahapan",
};

/* =====================================================================
 * LOGO PANITIA (kop dokumen cetak)
 * Disimpan di bucket privat; tampil lewat signed URL 1 jam (migrasi 0061).
 * ===================================================================== */

export const BUCKET_LOGO_PILKADES = "pilkades-logo";
export const EKSTENSI_LOGO = ["png", "jpg", "jpeg", "webp"];
export const MAKS_LOGO_MB = 2;

/** { path, url, diubahOleh, diubahPada } atau null bila belum ada logo / gagal dimuat. */
export async function ambilLogoPanitia(supabase, periodeId) {
  try {
    const { data } = await supabase
      .from("pilkades_logo")
      .select("logo_path, diubah_oleh_nama, diubah_pada")
      .eq("periode_id", periodeId)
      .maybeSingle();
    if (!data?.logo_path) return null;
    const { data: s } = await supabase.storage.from(BUCKET_LOGO_PILKADES).createSignedUrl(data.logo_path, 3600);
    if (!s?.signedUrl) return null;
    return { path: data.logo_path, url: s.signedUrl, diubahOleh: data.diubah_oleh_nama, diubahPada: data.diubah_pada };
  } catch {
    return null;
  }
}

/* =====================================================================
 * SUSUNAN PANITIA & PENANDATANGAN DOKUMEN
 * Login tetap satu akun panitia. Nama pengurus hanyalah data per periode
 * yang dipakai untuk blok tanda tangan di dokumen cetak.
 * ===================================================================== */

export const JABATAN_PANITIA = {
  ketua: "Ketua",
  sekretaris: "Sekretaris",
  bendahara: "Bendahara",
  anggota: "Anggota",
};

/** Jabatan yang hanya boleh dijabat satu orang per periode. */
export const JABATAN_UTAMA = ["ketua", "sekretaris", "bendahara"];

/**
 * Siapa yang menandatangani tiap jenis dokumen. Dokumen baru (berita acara,
 * laporan keuangan, dst.) cukup menambah satu baris di sini; tidak perlu akun baru.
 */
export const PENANDATANGAN_DOKUMEN = {
  daftar_pemilih: ["ketua", "sekretaris"],
  berita_acara_hasil: ["ketua", "sekretaris"],
  daftar_hadir: ["ketua", "sekretaris"],
  jadwal_tahapan: ["ketua"],
};

/** Susunan panitia satu periode: { daftar, ketua, sekretaris, bendahara, anggota[] , error }. */
export async function ambilSusunanPanitia(supabase, periodeId) {
  const { data, error } = await supabase
    .from("pilkades_panitia")
    .select("id, jabatan, nama, created_at")
    .eq("periode_id", periodeId)
    .order("created_at", { ascending: true });
  const daftar = data ?? [];
  const susunan = { daftar, anggota: daftar.filter((d) => d.jabatan === "anggota"), error: error ?? null };
  for (const j of JABATAN_UTAMA) susunan[j] = daftar.find((d) => d.jabatan === j) ?? null;
  return susunan;
}

/** Daftar penandatangan untuk satu jenis dokumen: [{ jabatan, label, nama | null }]. */
export function susunPenandatangan(jenisDokumen, susunan) {
  return (PENANDATANGAN_DOKUMEN[jenisDokumen] ?? []).map((j) => ({
    jabatan: j,
    label: JABATAN_PANITIA[j],
    nama: susunan?.[j]?.nama ?? null,
  }));
}

/* =====================================================================
 * CALON KEPALA DESA & DAFTAR HADIR (hari pemungutan suara)
 * ===================================================================== */

export const STATUS_CALON = {
  mendaftar: "Mendaftar",
  lolos_verifikasi: "Lolos verifikasi berkas",
  tidak_lolos: "Tidak lolos",
  ditetapkan: "Ditetapkan sebagai calon",
};

export const STATUS_CALON_BADGE = {
  mendaftar: "bg-slate-100 text-slate-700",
  lolos_verifikasi: "bg-sky-100 text-sky-800",
  tidak_lolos: "bg-red-100 text-red-700",
  ditetapkan: "bg-emerald-100 text-emerald-800",
};

/** Calon satu periode, urut nomor urut (yang belum bernomor di bawah). */
export async function ambilCalon(supabase, periodeId) {
  const { data, error } = await supabase
    .from("pilkades_calon")
    .select("id, nomor_urut, nama, status, alasan, visi_misi")
    .eq("periode_id", periodeId)
    .order("nomor_urut", { ascending: true, nullsFirst: false })
    .order("nama", { ascending: true });
  return { data: data ?? [], error: error ?? null };
}

/**
 * DPT resmi TERBARU satu periode beserta isinya. Daftar hadir mengacu ke sini,
 * bukan ke data pemilih yang masih bisa berubah. { head: null } bila belum ada DPT.
 */
export async function ambilDptTerbaru(supabase, periodeId) {
  const { data: head, error: errHead } = await supabase
    .from("pilkades_daftar_tetap")
    .select("id, versi, tanggal_penetapan, jumlah")
    .eq("periode_id", periodeId)
    .eq("jenis", "DPT")
    .order("versi", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (errHead || !head) return { head: null, isi: [], error: errHead ?? null };
  const { data, error } = await ambilSemuaBaris(() =>
    supabase
      .from("pilkades_daftar_tetap_isi")
      .select("id, urut, warga_id, nama_lengkap, nik_samar, jenis_kelamin, dusun, rt, rw, tps_nama")
      .eq("daftar_id", head.id)
      .order("urut")
  );
  return { head, isi: data ?? [], error };
}

/** Semua catatan hadir satu periode (terbaru dulu). */
export function ambilHadir(supabase, periodeId) {
  return ambilSemuaBaris(() =>
    supabase
      .from("pilkades_hadir")
      .select("id, warga_id, nama_lengkap, tps_nama, hadir_pada, dicatat_oleh_nama")
      .eq("periode_id", periodeId)
      .order("hadir_pada", { ascending: false })
      .order("id")
  );
}

/**
 * Rekap hasil pemungutan suara satu periode.
 * Mengembalikan { calon, tps[], total, hasil, error }:
 *  - calon : calon berstatus "ditetapkan", urut nomor urut
 *  - tps[] : { id, nama, lokasi, dpt, hadir, diisi, suara{calonId:n}, sah, tidakSah }
 *  - total : { dpt, hadir, sah, tidakSah, perCalon{calonId:n}, tpsDiisi }
 *  - hasil : baris penetapan calon terpilih (atau null)
 * Hanya angka; tidak ada data siapa memilih siapa.
 */
export async function ambilRekapSuara(supabase, periodeId) {
  const [calonRes, tpsRes, suaraRes, tidakSahRes, hasilRes, hadirRes, dpt] = await Promise.all([
    supabase.from("pilkades_calon").select("id, nomor_urut, nama, status")
      .eq("periode_id", periodeId).eq("status", "ditetapkan").order("nomor_urut"),
    supabase.from("pilkades_tps").select("id, nama, lokasi").eq("periode_id", periodeId).order("nama"),
    supabase.from("pilkades_suara").select("tps_id, calon_id, suara").eq("periode_id", periodeId),
    supabase.from("pilkades_suara_tps").select("tps_id, suara_tidak_sah, dicatat_oleh_nama, dicatat_pada")
      .eq("periode_id", periodeId),
    supabase.from("pilkades_hasil")
      .select("calon_id, tanggal_penetapan, nomor_berita_acara, catatan, suara_calon, suara_sah_total, suara_tidak_sah_total, ditetapkan_oleh_nama, ditetapkan_pada")
      .eq("periode_id", periodeId).maybeSingle(),
    ambilHadir(supabase, periodeId),
    ambilDptTerbaru(supabase, periodeId),
  ]);
  const error = calonRes.error ?? tpsRes.error ?? suaraRes.error ?? tidakSahRes.error ?? hasilRes.error ?? hadirRes.error ?? dpt.error ?? null;
  const calon = calonRes.data ?? [];

  const dptPerTps = new Map();
  for (const r of dpt.isi) dptPerTps.set(r.tps_nama, (dptPerTps.get(r.tps_nama) ?? 0) + 1);
  const hadirPerTps = new Map();
  for (const h of hadirRes.data ?? []) hadirPerTps.set(h.tps_nama, (hadirPerTps.get(h.tps_nama) ?? 0) + 1);
  const tidakSahMap = new Map((tidakSahRes.data ?? []).map((r) => [r.tps_id, r]));
  const suaraMap = new Map();
  for (const r of suaraRes.data ?? []) {
    const m = suaraMap.get(r.tps_id) ?? {};
    m[r.calon_id] = r.suara;
    suaraMap.set(r.tps_id, m);
  }

  const total = { dpt: 0, hadir: 0, sah: 0, tidakSah: 0, tpsDiisi: 0, perCalon: Object.fromEntries(calon.map((c) => [c.id, 0])) };
  const tps = (tpsRes.data ?? []).map((t) => {
    const rekap = tidakSahMap.get(t.id) ?? null;
    const suara = suaraMap.get(t.id) ?? {};
    const sah = calon.reduce((n, c) => n + (suara[c.id] ?? 0), 0);
    const baris = {
      id: t.id, nama: t.nama, lokasi: t.lokasi,
      dpt: dptPerTps.get(t.nama) ?? 0,
      hadir: hadirPerTps.get(t.nama) ?? 0,
      diisi: !!rekap, suara, sah,
      tidakSah: rekap?.suara_tidak_sah ?? 0,
      dicatatOleh: rekap?.dicatat_oleh_nama ?? null,
    };
    total.dpt += baris.dpt;
    total.hadir += baris.hadir;
    if (baris.diisi) {
      total.tpsDiisi += 1;
      total.sah += sah;
      total.tidakSah += baris.tidakSah;
      for (const c of calon) total.perCalon[c.id] += suara[c.id] ?? 0;
    }
    return baris;
  });
  return { calon, tps, total, hasil: hasilRes.data ?? null, error };
}

/** Calon dengan suara terbanyak dari rekap, atau seri. { pemenang, seri } */
export function tentukanPemenang(rekap) {
  const urut = [...rekap.calon].sort((a, b) => (rekap.total.perCalon[b.id] ?? 0) - (rekap.total.perCalon[a.id] ?? 0));
  if (!urut.length || !(rekap.total.perCalon[urut[0].id] > 0)) return { pemenang: null, seri: false };
  const seri = urut.length > 1 && rekap.total.perCalon[urut[0].id] === rekap.total.perCalon[urut[1].id];
  return { pemenang: seri ? null : urut[0], seri };
}

/**
 * PostgREST membatasi satu respons (default 1000 baris). Helper ini mengambil
 * semua baris per 1000. `buat` harus membuat query BARU (dengan urutan stabil)
 * setiap dipanggil.
 */
export async function ambilSemuaBaris(buat) {
  const ukuran = 1000;
  let semua = [];
  for (let dari = 0; ; dari += ukuran) {
    const { data, error } = await buat().range(dari, dari + ukuran - 1);
    if (error) return { data: null, error };
    semua = semua.concat(data ?? []);
    if (!data || data.length < ukuran) break;
  }
  return { data: semua, error: null };
}

export function ambilDaftarPemilih(supabase, periodeId) {
  return ambilSemuaBaris(() =>
    supabase.rpc("pilkades_daftar_pemilih", { p_periode: periodeId })
  );
}

export function ambilIsiArsip(supabase, daftarId) {
  return ambilSemuaBaris(() =>
    supabase
      .from("pilkades_daftar_tetap_isi")
      .select("id, urut, nama_lengkap, nik_samar, jenis_kelamin, tempat_lahir, tanggal_lahir, dusun, rt, rw, alamat, tps_nama")
      .eq("daftar_id", daftarId)
      .order("urut")
  );
}

/* =====================================================================
 * ALUR KERJA (panduan langkah) — dipakai dashboard, menu, dan bilah langkah
 * ===================================================================== */

export const LANGKAH_META = [
  { no: 1, kunci: "ambil", pendek: "Ambil Data", judul: "Ambil Data Warga", href: "/dashboard/pilkades/ambil",
    tombol: "Ambil data warga", penjelasan: "Salin data warga desa menjadi daftar calon pemilih." },
  { no: 2, kunci: "periksa", pendek: "Periksa", judul: "Periksa Pemilih", href: "/dashboard/pilkades/pemilih",
    tombol: "Periksa pemilih", penjelasan: "Tandai siapa yang berhak memilih. Warga yang belum cukup umur bisa disaring otomatis." },
  { no: 3, kunci: "tps", pendek: "Atur TPS", judul: "Atur TPS", href: "/dashboard/pilkades/tps",
    tombol: "Tambah TPS", penjelasan: "Tambahkan tempat pemungutan suara (TPS), misalnya “TPS 1 di Balai Desa”." },
  { no: 4, kunci: "tempatkan", pendek: "Tempatkan", judul: "Tempatkan Pemilih ke TPS", href: "/dashboard/pilkades/tempatkan",
    tombol: "Tempatkan pemilih", penjelasan: "Tentukan tiap pemilih mencoblos di TPS mana. Bisa banyak orang sekaligus." },
  { no: 5, kunci: "tetapkan", pendek: "Tetapkan", judul: "Tetapkan DPS lalu DPT", href: "/dashboard/pilkades/daftar",
    tombol: "Tetapkan daftar", penjelasan: "Jadikan daftar pemilih resmi. DPS ditetapkan dulu, lalu DPT. Setelah ditetapkan tidak bisa diubah." },
  { no: 6, kunci: "cetak", pendek: "Cetak", judul: "Cetak Daftar", href: "/dashboard/pilkades/cetak",
    tombol: "Cetak daftar", penjelasan: "Cetak daftar pemilih untuk ditempel di papan pengumuman: DPS untuk diumumkan lebih dulu, DPT setelah ditetapkan." },
];

/**
 * Hitung angka-angka penting & status 6 langkah.
 * status: "selesai" | "berjalan" | "siap" | "terkunci"
 */
export async function ambilLangkah(supabase, periode) {
  const hitung = async (fn) => {
    let q = supabase
      .from("pilkades_pemilih")
      .select("id", { count: "exact", head: true })
      .eq("periode_id", periode.id);
    if (fn) q = fn(q);
    const { count } = await q;
    return count ?? 0;
  };
  const [total, belum, perluCek, memenuhi, tidakMemenuhi, tanpaTps, tpsRes, arsipRes] = await Promise.all([
    hitung(),
    hitung((q) => q.eq("status_verifikasi", "belum")),
    hitung((q) => q.eq("status_verifikasi", "perlu_dicek")),
    hitung((q) => q.eq("status_verifikasi", "memenuhi_syarat")),
    hitung((q) => q.eq("status_verifikasi", "tidak_memenuhi")),
    hitung((q) => q.eq("status_verifikasi", "memenuhi_syarat").is("tps_id", null)),
    supabase.from("pilkades_tps").select("id", { count: "exact", head: true }).eq("periode_id", periode.id),
    supabase
      .from("pilkades_daftar_tetap")
      .select("id, jenis, versi, tanggal_penetapan, jumlah")
      .eq("periode_id", periode.id)
      .order("created_at", { ascending: false }),
  ]);
  const jumlahTps = tpsRes.count ?? 0;
  const arsip = arsipRes.data ?? [];
  const adaDps = arsip.some((a) => a.jenis === "DPS");
  const adaDpt = arsip.some((a) => a.jenis === "DPT");

  const siapTetapkan = memenuhi > 0 && jumlahTps > 0 && tanpaTps === 0;
  let alasanTetapkan = null;
  if (memenuhi === 0) alasanTetapkan = "Belum ada pemilih berstatus “Memenuhi syarat”. Selesaikan Langkah 2 dulu.";
  else if (jumlahTps === 0) alasanTetapkan = "Belum ada TPS. Selesaikan Langkah 3 dulu.";
  else if (tanpaTps > 0) alasanTetapkan = `${tanpaTps} pemilih belum ditempatkan ke TPS. Selesaikan Langkah 4 dulu.`;

  const status = {
    ambil: { s: total > 0 ? "selesai" : "siap", ket: total > 0 ? `${total} calon pemilih sudah diambil` : "Belum ada data" },
    periksa: total === 0
      ? { s: "terkunci", ket: "Ambil data warga dulu (Langkah 1)." }
      : belum === 0 && perluCek === 0
        ? { s: "selesai", ket: `${memenuhi} memenuhi syarat · ${tidakMemenuhi} tidak` }
        : { s: "berjalan", ket: `${belum} belum diperiksa${perluCek ? ` · ${perluCek} perlu dicek` : ""}` },
    tps: jumlahTps > 0
      ? { s: "selesai", ket: `${jumlahTps} TPS sudah dibuat` }
      : { s: "siap", ket: "Belum ada TPS" },
    tempatkan: jumlahTps === 0
      ? { s: "terkunci", ket: "Buat TPS dulu (Langkah 3)." }
      : memenuhi === 0
        ? { s: "terkunci", ket: "Belum ada pemilih yang memenuhi syarat (Langkah 2)." }
        : tanpaTps === 0
          ? { s: "selesai", ket: "Semua pemilih sudah punya TPS" }
          : { s: tanpaTps < memenuhi ? "berjalan" : "siap", ket: `${tanpaTps} pemilih belum punya TPS` },
    tetapkan: adaDpt
      ? { s: "selesai", ket: "DPS dan DPT sudah ditetapkan" }
      : adaDps
        ? { s: "berjalan", ket: "DPS sudah ditetapkan. Cetak & umumkan DPS (Langkah 6), lalu tetapkan DPT" }
        : siapTetapkan
          ? { s: "siap", ket: `${memenuhi} pemilih siap ditetapkan` }
          : { s: "terkunci", ket: alasanTetapkan },
    // Selesai setelah DPT ditetapkan (daftar resmi final sudah bisa dicetak kapan saja),
    // supaya "Langkah berikutnya" di beranda bisa maju ke tahap calon, hari-H, dan hasil.
    cetak: total === 0
      ? { s: "terkunci", ket: "Belum ada data untuk dicetak." }
      : adaDpt
        ? { s: "selesai", ket: "DPT sudah ditetapkan; daftar resmi bisa dicetak kapan saja" }
        : adaDps
          ? { s: "siap", ket: "DPS siap dicetak untuk diumumkan" }
          : { s: "siap", ket: "Baru bisa cetak draf" },
  };

  const langkah = LANGKAH_META.map((m) => ({ ...m, status: status[m.kunci].s, ket: status[m.kunci].ket }));
  const berikutnya = langkah.find((l) => l.status === "berjalan" || l.status === "siap") ?? null;

  return {
    total, belum, perluCek, memenuhi, tidakMemenuhi, tanpaTps, jumlahTps, arsip,
    adaDps, adaDpt, siapTetapkan, alasanTetapkan, langkah, berikutnya,
  };
}

/** Gabungkan nama dusun ganda di teks riwayat: "Dusun Dusun 1" -> "Dusun 1". */
export function rapikanDusun(teks) {
  return String(teks ?? "").replace(/\bDusun\s+Dusun\b/gi, "Dusun");
}
