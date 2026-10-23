import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ambilPeriode, formatTanggal, JENIS_DAFTAR_LABEL } from "@/lib/pilkades";
import FormTetapkan from "./FormTetapkan";

export const metadata = { title: "DPS & DPT" };

export default async function DaftarPage() {
  const supabase = await createClient();
  const periode = await ambilPeriode(supabase);
  if (!periode) return <p className="text-sm text-slate-500">Belum ada periode Pilkades.</p>;

  const hitung = async (kolom, nilai, extra) => {
    let q = supabase.from("pilkades_pemilih").select("id", { count: "exact", head: true }).eq("periode_id", periode.id);
    q = q.eq(kolom, nilai);
    if (extra) q = extra(q);
    const { count } = await q;
    return count ?? 0;
  };
  const [memenuhi, belum, perluCek, tanpaTps, { data: arsip }] = await Promise.all([
    hitung("status_verifikasi", "memenuhi_syarat"),
    hitung("status_verifikasi", "belum"),
    hitung("status_verifikasi", "perlu_dicek"),
    hitung("status_verifikasi", "memenuhi_syarat", (q) => q.is("tps_id", null)),
    supabase
      .from("pilkades_daftar_tetap")
      .select("id, jenis, versi, tanggal_penetapan, nomor_berita_acara, jumlah, ditetapkan_oleh_nama")
      .eq("periode_id", periode.id)
      .order("created_at", { ascending: false }),
  ]);

  const adaDps = (arsip ?? []).some((a) => a.jenis === "DPS");
  const berlaku = {};
  for (const a of arsip ?? []) if (!berlaku[a.jenis]) berlaku[a.jenis] = a.id; // terbaru dulu

  const peringatan = [
    belum > 0 && `${belum} calon pemilih masih "Belum diperiksa"`,
    perluCek > 0 && `${perluCek} calon pemilih berstatus "Perlu dicek"`,
    tanpaTps > 0 && `${tanpaTps} pemilih memenuhi syarat belum punya TPS`,
  ].filter(Boolean);

  const alasanKosong = memenuhi === 0 ? 'Belum ada pemilih berstatus "Memenuhi syarat".' : null;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-800">DPS &amp; DPT &mdash; {periode.nama}</h1>
        <p className="text-sm text-slate-500">
          Menetapkan daftar menyalin pemilih yang <b>memenuhi syarat</b> saat ini menjadi arsip tetap.
          Perubahan data warga sesudahnya tidak mengubah daftar yang sudah ditetapkan.
        </p>
      </div>

      {peringatan.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-medium">Periksa dulu sebelum menetapkan:</p>
          <ul className="mt-1 list-disc pl-5">
            {peringatan.map((p) => <li key={p}>{p}</li>)}
          </ul>
          <p className="mt-2 text-xs">
            Yang belum berstatus &ldquo;memenuhi syarat&rdquo; tidak ikut masuk daftar.{" "}
            <Link href="/dashboard/pilkades/pemilih" className="underline">Buka Daftar Pemilih</Link>
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <FormTetapkan periodeId={periode.id} jenis="DPS" jumlah={memenuhi} nonaktifAlasan={alasanKosong} />
        <FormTetapkan
          periodeId={periode.id}
          jenis="DPT"
          jumlah={memenuhi}
          nonaktifAlasan={alasanKosong ?? (adaDps ? null : "DPT hanya bisa ditetapkan setelah ada DPS.")}
        />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Arsip daftar yang sudah ditetapkan</h2>
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {(arsip ?? []).map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {JENIS_DAFTAR_LABEL[a.jenis]} &mdash; versi {a.versi}
                  {berlaku[a.jenis] === a.id && (
                    <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">berlaku</span>
                  )}
                </p>
                <p className="text-xs text-slate-400">
                  Ditetapkan {formatTanggal(a.tanggal_penetapan)} · {a.jumlah} pemilih
                  {a.nomor_berita_acara && ` · BA ${a.nomor_berita_acara}`}
                  {a.ditetapkan_oleh_nama && ` · oleh ${a.ditetapkan_oleh_nama}`}
                </p>
              </div>
              <Link href={`/dashboard/pilkades/daftar/${a.id}`} className="rounded-lg border border-slate-300 px-3 py-1 text-xs hover:bg-slate-50">
                Lihat &amp; cetak
              </Link>
            </li>
          ))}
          {!arsip?.length && <li className="px-4 py-6 text-center text-sm text-slate-400">Belum ada daftar yang ditetapkan.</li>}
        </ul>
      </div>
    </div>
  );
}
