import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ambilRole } from "@/lib/akses";
import { bisaUbahPilkades } from "@/lib/roles";
import { ambilPeriode, dptTerkunci } from "@/lib/pilkades";
import { ambilCalonPemilih, sinkronPenduduk } from "../actions";
import PanduanLangkah from "@/components/pilkades/PanduanLangkah";
import { JudulHalaman, Kartu, KosongPandu, Catatan, tombol } from "@/components/pilkades/UI";
import PesanSekali from "@/components/pilkades/PesanSekali";
import { pesanDari, COBA_LAGI } from "@/lib/pilkadesPesan";

export const metadata = { title: "Ambil Data Warga" };

const PESAN_HASIL = {
  ok: (sp) => ["sukses", "Berhasil", `${sp.n !== undefined ? `${sp.n} calon pemilih baru ditambahkan.` : "Data warga berhasil diambil."}${sp.ta !== undefined ? ` ${sp.ta} meninggal/pindah ditandai tidak memenuhi syarat, ${sp.bd ?? 0} baru datang (kurang dari 6 bulan) ditandai perlu dicek.` : ""}`],
  sinkron: (sp) => ["sukses", "Sudah disamakan dengan data penduduk", `${sp.ta ?? 0} pemilih yang sudah meninggal/pindah ditandai “Tidak memenuhi syarat”; ${sp.bd ?? 0} yang baru datang (kurang dari 6 bulan) ditandai “Perlu dicek”. Keputusan manual lain tidak diubah.`],
  terkunci: ["perhatian", "DPT sudah ditetapkan", "Daftar pemilih sudah terkunci, jadi data warga tidak bisa diambil atau disamakan lagi. Gunakan menu Pemilih Tambahan."],
  gagal: ["bahaya", "Belum berhasil", `Data warga gagal diproses. ${COBA_LAGI}`],
};

export default async function AmbilPage({ searchParams }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const periode = await ambilPeriode(supabase);
  const { role } = await ambilRole(supabase);
  const bisaUbahAwal = bisaUbahPilkades(role);
  if (!periode) {
    return <KosongPandu judul="Belum ada periode Pilkades" href="/dashboard/pilkades/pengaturan/periode" label="Buka Periode Pilkades" />;
  }
  const terkunciDpt = await dptTerkunci(supabase, periode.id);
  const bisaUbah = bisaUbahAwal && !terkunciDpt;
  const { count } = await supabase
    .from("pilkades_pemilih")
    .select("id", { count: "exact", head: true })
    .eq("periode_id", periode.id);
  const total = count ?? 0;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PanduanLangkah aktif="ambil" />
      <JudulHalaman
        langkah={1}
        judul="Ambil Data Warga"
        penjelasan="Salin data warga yang sudah ada di SI-LIPU menjadi daftar calon pemilih. Anda tidak perlu mengetik ulang. Data warga yang asli tidak berubah."
      />

      <PesanSekali pesan={pesanDari(PESAN_HASIL, sp)} bersihkan={["hasil", "n", "ta", "bd"]} />
      {terkunciDpt && (
        <Catatan butir={[{ jenis: "info", judul: "DPT sudah ditetapkan, halaman ini terkunci", isi: "Daftar pemilih dan TPS tidak bisa diubah lagi. Warga yang terlewat dicatat lewat menu Pemilih Tambahan." }]} />
      )}

      {total === 0 ? (
        <KosongPandu judul="Belum ada calon pemilih" teks="Klik tombol di bawah untuk mengambil data warga desa.">
          {bisaUbah && (
            <form action={ambilCalonPemilih} className="mt-5">
              <input type="hidden" name="periode_id" value={periode.id} />
              <button className={`${tombol.utama} text-base`}>Ambil Data Warga Sekarang</button>
            </form>
          )}
        </KosongPandu>
      ) : (
        <Kartu className="space-y-4">
          <p className="text-lg font-bold text-emerald-800">✓ Sudah ada {total} calon pemilih</p>
          <p className="text-sm text-slate-700">
            Ada warga baru yang belum masuk? Klik “Tambah warga baru”. Nama yang sudah ada tidak akan dobel.
            Bila ada warga yang meninggal, pindah, atau baru datang, klik “Samakan dengan data penduduk”: yang meninggal/pindah ditandai “Tidak memenuhi syarat”, dan yang datang kurang dari 6 bulan sebelum hari pemungutan ditandai “Perlu dicek”.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/pilkades/pemilih" className={tombol.utama}>Lanjut ke Langkah 2: Periksa Pemilih</Link>
            {bisaUbah && (
              <form action={sinkronPenduduk}>
                <input type="hidden" name="periode_id" value={periode.id} />
                <button className={tombol.sekunder}>Samakan dengan data penduduk</button>
              </form>
            )}
            {bisaUbah && (
              <form action={ambilCalonPemilih}>
                <input type="hidden" name="periode_id" value={periode.id} />
                <button className={tombol.sekunder}>Tambah warga baru</button>
              </form>
            )}
          </div>
        </Kartu>
      )}
    </div>
  );
}
