import { createClient } from "@/lib/supabase/server";
import { ambilRole } from "@/lib/akses";
import { isAdminRole } from "@/lib/roles";
import { formatTanggal } from "@/lib/pilkades";
import { buatPeriode, aktifkanPeriode } from "../actions";

export const metadata = { title: "Periode Pilkades" };

export default async function PeriodePage() {
  const supabase = await createClient();
  const { role } = await ambilRole(supabase);
  const admin = isAdminRole(role);
  const { data: daftar } = await supabase
    .from("pilkades_periode")
    .select("id, nama, tanggal_pemungutan, aktif")
    .order("created_at", { ascending: false });

  const input = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy";

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-800">Periode Pilkades</h1>
        <p className="text-sm text-slate-500">
          Setiap pemilihan punya periode sendiri. Hanya satu periode yang aktif.
          {!admin && " Periode dibuat oleh Administrator."}
        </p>
      </div>

      {admin && (
        <form action={buatPeriode} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
          <input name="nama" required placeholder="mis. Pilkades 2026" className={input} />
          <input name="tanggal_pemungutan" type="date" className={input} />
          <button className="rounded-lg bg-navy py-2 text-sm font-medium text-white hover:bg-navy-light">
            Buat periode
          </button>
        </form>
      )}

      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {(daftar ?? []).map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-800">{p.nama}</p>
              <p className="text-xs text-slate-400">Pemungutan: {formatTanggal(p.tanggal_pemungutan)}</p>
            </div>
            {p.aktif ? (
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Aktif</span>
            ) : (
              admin && (
                <form action={aktifkanPeriode}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className="rounded-lg border border-slate-300 px-3 py-1 text-xs hover:bg-slate-50">
                    Jadikan aktif
                  </button>
                </form>
              )
            )}
          </li>
        ))}
        {!daftar?.length && <li className="px-4 py-6 text-center text-sm text-slate-400">Belum ada periode.</li>}
      </ul>
    </div>
  );
}
