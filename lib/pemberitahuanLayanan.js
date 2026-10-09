import { terimaPemberitahuanLayanan } from "@/lib/roles";

// Pemberitahuan pengajuan layanan baru untuk Kepala Desa & Ketua RT.
//
// Yang dihitung: pengajuan berstatus "diajukan" (belum disentuh admin). Begitu
// admin memproses, pengajuan hilang dari pemberitahuan dengan sendirinya, jadi
// tidak perlu tabel "sudah dibaca".
//
// Cakupan:
//   * Kepala Desa : semua pengajuan.
//   * Ketua RT    : hanya pengajuan dari warga di wilayahnya. Wilayah diketahui
//                   dari tautan ke data warga; baris warga di luar RT-nya tidak
//                   terbaca karena RLS (embed `warga` menjadi null), lalu
//                   disaring di sini. Pengajuan isian manual (tanpa tautan ke
//                   data warga) tidak bisa ditempatkan ke RT mana pun, jadi
//                   tidak ditampilkan ke Ketua RT. Pengaduan ANONIM ditampilkan
//                   (wilayahnya memang tidak tercatat), tanpa identitas apa pun.
//
// Privasi: yang diambil hanya nama, layanan, jenis pengaduan, wilayah, dan
// waktu. NIK, No. HP, dan isi keterangan sengaja TIDAK diambil. Untuk pengaduan
// anonim kode tracking juga tidak diambil (itu satu-satunya "kunci" pelapor).

const BATAS_AMBIL = 100;

export function lamaTunggu(iso) {
  const menit = Math.floor((Date.now() - new Date(iso).getTime()) / 6e4);
  if (menit < 1) return "baru saja";
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  return `${Math.floor(jam / 24)} hari lalu`;
}

function labelWilayah(w) {
  if (!w) return "";
  const dusun = String(w.dusun ?? "").trim();
  const bagian = [];
  if (dusun) bagian.push(/^dusun\b/i.test(dusun) ? dusun : `Dusun ${dusun}`);
  if (w.rt) bagian.push(`RT ${String(w.rt).replace(/^rt\s*/i, "")}`);
  if (w.rw) bagian.push(`RW ${String(w.rw).replace(/^rw\s*/i, "")}`);
  return bagian.join(", ");
}

/**
 * @param supabase  client server milik akun yang login (RLS ikut berlaku)
 * @param role      role akun yang login
 * @param tampil    jumlah baris yang dikembalikan di `item` (0 = hanya hitung)
 * @returns {{ total: number, terpotong: boolean, item: Array }}
 */
export async function ambilPemberitahuanLayanan(supabase, role, { tampil = 8 } = {}) {
  const kosong = { total: 0, terpotong: false, item: [] };
  if (!terimaPemberitahuanLayanan(role)) return kosong;

  const perWilayah = role === "ketua_rt";

  let query = supabase
    .from("pengajuan_layanan")
    .select(
      "id, kode_tracking, anonim, nama_pemohon, jenis_pengaduan, created_at, " +
        "jenis_layanan_master(nama_layanan), warga(nama_lengkap, dusun, rt, rw)"
    )
    .eq("status", "diajukan")
    .order("created_at", { ascending: false })
    .limit(BATAS_AMBIL);

  if (perWilayah) query = query.or("anonim.eq.true,warga_id.not.is.null");

  const { data, error } = await query;
  if (error) {
    console.error("ambilPemberitahuanLayanan gagal:", error);
    return kosong;
  }

  let baris = data ?? [];
  if (perWilayah) baris = baris.filter((r) => r.anonim || r.warga);

  const item = baris.slice(0, Math.max(0, tampil)).map((r) => {
    const layanan = r.jenis_layanan_master?.nama_layanan ?? "Layanan";
    if (r.anonim) {
      return {
        id: r.id,
        anonim: true,
        siapa: "Pelapor anonim",
        layanan,
        jenisPengaduan: r.jenis_pengaduan || "",
        wilayah: "",
        kode: "",
        masuk: lamaTunggu(r.created_at),
      };
    }
    return {
      id: r.id,
      anonim: false,
      siapa: r.warga?.nama_lengkap || r.nama_pemohon || "Tanpa nama",
      layanan,
      jenisPengaduan: r.jenis_pengaduan || "",
      wilayah: labelWilayah(r.warga),
      kode: r.kode_tracking,
      masuk: lamaTunggu(r.created_at),
    };
  });

  return {
    total: baris.length,
    terpotong: (data ?? []).length === BATAS_AMBIL,
    item,
  };
}
