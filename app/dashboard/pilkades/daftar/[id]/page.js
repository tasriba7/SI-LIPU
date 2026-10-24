import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adalahUuid } from "@/lib/validasiPengajuan";
import { ambilIsiArsip, formatTanggal, JENIS_DAFTAR_LABEL } from "@/lib/pilkades";

export const metadata = { title: "Arsip Daftar Pemilih" };
const PER_HALAMAN = 50;

export default async function DetailArsip({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  if (!adalahUuid(id)) notFound();

  const supabase = await createClient();
  const { data: d } = await supabase
    .from("pilkades_daftar_tetap")
    .select("id, jenis, versi, tanggal_penetapan, nomor_berita_acara, catatan, jumlah, ditetapkan_oleh_nama")
    .eq("id", id)
    .maybeSingle();
  if (!d) notFound();

  const { data: isi } = await ambilIsiArsip(supabase, id);
  const semua = isi ?? [];
  const halaman = Math.max(1, parseInt(sp.hal ?? "1", 10) || 1);
  const totalHal = Math.max(1, Math.ceil(semua.length / PER_HALAMAN));
  const tampil = semua.slice((halaman - 1) * PER_HALAMAN, halaman * PER_HALAMAN);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <Link href="/dashboard/pilkades/daftar" className="text-xs text-slate-400 hover:text-slate-600">
          &larr; Kembali ke DPS &amp; DPT
        </Link>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-base font-bold text-slate-800">
              {JENIS_DAFTAR_LABEL[d.jenis]} &mdash; versi {d.versi}
            </h1>
            <p className="text-sm text-slate-500">
              Ditetapkan {formatTanggal(d.tanggal_penetapan)} · {d.jumlah} pemilih
              {d.nomor_berita_acara && ` · BA ${d.nomor_berita_acara}`}
              {d.ditetapkan_oleh_nama && ` · oleh ${d.ditetapkan_oleh_nama}`}
            </p>
            {d.catatan && <p className="text-xs text-slate-400">Catatan: {d.catatan}</p>}
          </div>
          <Link
            href={`/cetak/pilkades?daftar=${d.id}`}
            target="_blank"
            className="rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white hover:bg-navy-light"
          >
            Cetak F4 lanskap
          </Link>
        </div>
        <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Arsip ini salinan tetap dan tidak bisa diubah. Jika ada koreksi, tetapkan versi baru dari menu DPS &amp; DPT.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2">No</th>
              <th className="px-3 py-2">Nama</th>
              <th className="px-3 py-2">NIK</th>
              <th className="px-3 py-2">L/P</th>
              <th className="px-3 py-2">Dusun / RT-RW</th>
              <th className="px-3 py-2">TPS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tampil.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-1.5 text-slate-400">{r.urut}</td>
                <td className="px-3 py-1.5 font-medium text-slate-800">{r.nama_lengkap}</td>
                <td className="px-3 py-1.5 text-xs text-slate-500">{r.nik_samar}</td>
                <td className="px-3 py-1.5">{r.jenis_kelamin ?? "-"}</td>
                <td className="px-3 py-1.5 text-xs text-slate-600">
                  {r.dusun ?? "-"}{r.rt || r.rw ? `, RT ${r.rt ?? "-"}/RW ${r.rw ?? "-"}` : ""}
                </td>
                <td className="px-3 py-1.5">{r.tps_nama ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>Halaman {halaman} dari {totalHal}</span>
        <span className="flex gap-3">
          {halaman > 1 && <Link href={`?hal=${halaman - 1}`} className="text-navy underline">Sebelumnya</Link>}
          {halaman < totalHal && <Link href={`?hal=${halaman + 1}`} className="text-navy underline">Berikutnya</Link>}
        </span>
      </div>
    </div>
  );
}
