import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ambilRole } from "@/lib/akses";
import { bisaUbahPilkades } from "@/lib/roles";
import { ambilPeriode, dptTerkunci } from "@/lib/pilkades";
import { tambahTps, hapusTps } from "../actions";
import PanduanLangkah from "@/components/pilkades/PanduanLangkah";
import TombolKonfirmasi from "@/components/pilkades/TombolKonfirmasi";
import { JudulHalaman, Kartu, KosongPandu, tombol, kolom, labelKolom } from "@/components/pilkades/UI";
import PesanSekali from "@/components/pilkades/PesanSekali";
import { pesanDari, COBA_LAGI } from "@/lib/pilkadesPesan";

export const metadata = { title: "Atur TPS" };

const PESAN_HASIL = {
  ok: (sp) => ["sukses", "Berhasil", sp.nama ? `“${sp.nama}” sudah ditambahkan.` : "TPS ditambahkan."],
  hapus: (sp) => [
    "sukses",
    "TPS dihapus",
    `${sp.nama ? `“${sp.nama}”` : "TPS"} sudah dihapus.${Number(sp.n) > 0 ? ` ${sp.n} pemilih di TPS itu kembali “belum punya TPS”. Tempatkan lagi di Langkah 4.` : ""}`,
  ],
  kembar: ["perhatian", "Nama TPS sudah dipakai", "Gunakan nama lain, misalnya TPS 2."],
  terkunci: ["perhatian", "TPS terkunci", "DPT sudah ditetapkan, jadi TPS tidak bisa ditambah, diubah, atau dihapus lagi."],
  gagal: ["bahaya", "TPS belum berhasil diproses", COBA_LAGI],
};

export default async function TpsPage({ searchParams }) {
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
  const { data: tps } = await supabase
    .from("pilkades_tps")
    .select("id, nama, lokasi")
    .eq("periode_id", periode.id)
    .order("nama");

  const jumlah = {};
  await Promise.all(
    (tps ?? []).map(async (t) => {
      const { count } = await supabase
        .from("pilkades_pemilih")
        .select("id", { count: "exact", head: true })
        .eq("tps_id", t.id);
      jumlah[t.id] = count ?? 0;
    })
  );
  const ada = (tps ?? []).length > 0;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PanduanLangkah aktif="tps" />
      <JudulHalaman
        langkah={3}
        judul="Atur TPS"
        penjelasan={terkunciDpt ? "Daftar TPS dan jumlah pemilih di tiap TPS." : "TPS adalah tempat pemungutan suara, yaitu tempat warga mencoblos. Tambahkan semua TPS yang akan dipakai di desa ini."}
      />

      <PesanSekali pesan={pesanDari(PESAN_HASIL, sp)} />

      {bisaUbah && (
        <Kartu>
          <h2 className="text-base font-bold text-sky-950">{ada ? "Tambah TPS lagi" : "Tambah TPS pertama Anda"}</h2>
          <form action={tambahTps} className="mt-3 grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="periode_id" value={periode.id} />
            <label className={labelKolom}>
              Nama TPS
              <input name="nama" required placeholder="Contoh: TPS 1" className={`${kolom} mt-1 font-normal`} />
            </label>
            <label className={labelKolom}>
              Lokasi <span className="font-normal text-slate-600">(boleh kosong)</span>
              <input name="lokasi" placeholder="Contoh: Balai Desa" className={`${kolom} mt-1 font-normal`} />
            </label>
            <div className="sm:col-span-2">
              <button className={ada ? tombol.sekunder : tombol.utama}>+ Tambah TPS</button>
            </div>
          </form>
        </Kartu>
      )}

      {ada ? (
        <ul className="divide-y divide-sky-100 overflow-hidden rounded-xl border border-sky-100 bg-white shadow-sm">
          {tps.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div>
                <p className="text-base font-bold text-slate-900">{t.nama}</p>
                <p className="text-sm text-slate-600">{t.lokasi || "Lokasi belum diisi"}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-bold text-sky-900">{jumlah[t.id]} pemilih</span>
                {bisaUbah && (
                  <form action={hapusTps}>
                    <input type="hidden" name="id" value={t.id} />
                    <TombolKonfirmasi
                      pesan={`Hapus ${t.nama}? ${jumlah[t.id]} pemilih di TPS ini akan kembali menjadi “belum punya TPS”.`}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50"
                    >
                      Hapus
                    </TombolKonfirmasi>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        !bisaUbah && <KosongPandu judul="Belum ada TPS" teks="TPS ditambahkan oleh Panitia Pilkades." />
      )}

      {ada && !terkunciDpt && (
        <div className="flex justify-end">
          <Link href="/dashboard/pilkades/tempatkan" className={tombol.utama}>Lanjut ke Langkah 4: Tempatkan Pemilih →</Link>
        </div>
      )}
    </div>
  );
}
