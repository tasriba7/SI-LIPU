// Ringkasan jumlah pengajuan layanan & pengaduan per status, untuk beranda
// dashboard Kepala Desa dan Anggota BPD (hanya angka, tanpa data pribadi).
//
//   sumber "pantau"   -> view pengajuan_layanan_pantau (Anggota BPD)
//   sumber "langsung" -> tabel pengajuan_layanan (Kepala Desa; boleh membaca,
//                        kategori lewat join jenis_layanan_master)

const STATUS = ["diajukan", "diproses", "selesai", "ditolak"];

export async function ambilRingkasanPelayanan(supabase, sumber) {
  function hitung(status, pengaduan) {
    if (sumber === "pantau") {
      let q = supabase
        .from("pengajuan_layanan_pantau")
        .select("id", { count: "exact", head: true })
        .eq("status", status);
      if (pengaduan) q = q.eq("kategori", "pengaduan");
      return q;
    }
    let q = supabase
      .from("pengajuan_layanan")
      .select(
        pengaduan ? "id, jenis_layanan_master!inner(kategori)" : "id",
        { count: "exact", head: true }
      )
      .eq("status", status);
    if (pengaduan) q = q.eq("jenis_layanan_master.kategori", "pengaduan");
    return q;
  }

  const [semua, aduan] = await Promise.all([
    Promise.all(STATUS.map((s) => hitung(s, false))),
    Promise.all(STATUS.map((s) => hitung(s, true))),
  ]);
  const ke = (hasil) =>
    Object.fromEntries(STATUS.map((s, i) => [s, hasil[i].count ?? 0]));

  return { layanan: ke(semua), pengaduan: ke(aduan) };
}
