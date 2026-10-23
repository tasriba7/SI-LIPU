import { createClient } from "@/lib/supabase/server";
import { ambilPeriode, STATUS_VERIFIKASI } from "@/lib/pilkades";

export const metadata = { title: "Cetak Daftar Pemilih" };

export default async function PilihanCetak() {
  const supabase = await createClient();
  const periode = await ambilPeriode(supabase);
  if (!periode) return <p className="text-sm text-slate-500">Belum ada periode Pilkades.</p>;

  const [{ data: tps }, { data: pemilih }] = await Promise.all([
    supabase.from("pilkades_tps").select("id, nama").eq("periode_id", periode.id).order("nama"),
    supabase.rpc("pilkades_daftar_pemilih", { p_periode: periode.id }),
  ]);
  const dusunList = [...new Set((pemilih ?? []).map((r) => r.dusun).filter(Boolean))].sort();
  const input = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-800">Cetak Daftar Pemilih</h1>
        <p className="text-sm text-slate-500">
          Kertas F4 lanskap (330 x 215 mm), dua kolom berdampingan, margin 6 mm. Selama arsip DPS/DPT
          belum dibuat, semua cetakan diberi tanda air &ldquo;DRAF&rdquo;.
        </p>
      </div>

      <form action="/cetak/pilkades" target="_blank" className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <label className="block text-sm text-slate-600">
          TPS
          <select name="tps" className={input} defaultValue="">
            <option value="">Semua TPS</option>
            <option value="none">Belum punya TPS</option>
            {(tps ?? []).map((t) => <option key={t.id} value={t.id}>{t.nama}</option>)}
          </select>
        </label>
        <label className="block text-sm text-slate-600">
          Dusun
          <select name="dusun" className={input} defaultValue="">
            <option value="">Semua dusun</option>
            {dusunList.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <label className="block text-sm text-slate-600">
          Status
          <select name="status" className={input} defaultValue="memenuhi_syarat">
            {Object.entries(STATUS_VERIFIKASI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            <option value="semua">Semua status</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" name="nik" value="1" />
          Tampilkan NIK samar (jangan dicentang untuk daftar yang ditempel di tempat umum)
        </label>
        <button className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light">
          Buka pratinjau cetak
        </button>
      </form>
    </div>
  );
}
