import { createClient } from "@/lib/supabase/server";
import { ambilPeriode } from "@/lib/pilkades";
import { tambahTps, hapusTps } from "../actions";

export const metadata = { title: "TPS Pilkades" };

export default async function TpsPage() {
  const supabase = await createClient();
  const periode = await ambilPeriode(supabase);
  if (!periode) return <p className="text-sm text-slate-500">Belum ada periode Pilkades.</p>;

  const { data: tps } = await supabase
    .from("pilkades_tps")
    .select("id, nama, lokasi")
    .eq("periode_id", periode.id)
    .order("nama");

  const jumlah = {};
  for (const t of tps ?? []) {
    const { count } = await supabase
      .from("pilkades_pemilih")
      .select("id", { count: "exact", head: true })
      .eq("tps_id", t.id);
    jumlah[t.id] = count ?? 0;
  }

  const input = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy";

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-800">TPS &mdash; {periode.nama}</h1>
        <p className="text-sm text-slate-500">Tempat pemungutan suara dan jumlah pemilih yang ditempatkan.</p>
      </div>

      <form action={tambahTps} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
        <input type="hidden" name="periode_id" value={periode.id} />
        <input name="nama" required placeholder="Nama TPS, mis. TPS 1" className={input} />
        <input name="lokasi" placeholder="Lokasi, mis. Balai Desa" className={input} />
        <button className="rounded-lg bg-navy py-2 text-sm font-medium text-white hover:bg-navy-light">Tambah TPS</button>
      </form>

      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {(tps ?? []).map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-800">{t.nama}</p>
              <p className="text-xs text-slate-400">{t.lokasi || "Lokasi belum diisi"}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">{jumlah[t.id]} pemilih</span>
              <form action={hapusTps}>
                <input type="hidden" name="id" value={t.id} />
                <button className="text-xs text-red-500 hover:underline">Hapus</button>
              </form>
            </div>
          </li>
        ))}
        {!tps?.length && <li className="px-4 py-6 text-center text-sm text-slate-400">Belum ada TPS.</li>}
      </ul>
    </div>
  );
}
