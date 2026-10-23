import { createClient } from "@/lib/supabase/server";
import { AKSI_LABEL } from "@/lib/pilkades";

export const metadata = { title: "Riwayat Aktivitas Pilkades" };

export default async function RiwayatPage() {
  const supabase = await createClient();
  const { data: log } = await supabase
    .from("pilkades_log")
    .select("id, aksi, detail, oleh_nama, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-lg font-bold text-slate-800">Riwayat Aktivitas</h1>
        <p className="text-sm text-slate-500">
          200 catatan terbaru: pengambilan calon pemilih, penetapan DPS/DPT, dan pencetakan daftar.
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2">Waktu</th>
              <th className="px-3 py-2">Oleh</th>
              <th className="px-3 py-2">Aksi</th>
              <th className="px-3 py-2">Keterangan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(log ?? []).map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap px-3 py-1.5 text-xs text-slate-500">
                  {new Date(l.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Makassar" })}
                </td>
                <td className="px-3 py-1.5">{l.oleh_nama ?? "-"}</td>
                <td className="px-3 py-1.5">{AKSI_LABEL[l.aksi] ?? l.aksi}</td>
                <td className="px-3 py-1.5 text-xs text-slate-600">{l.detail ?? ""}</td>
              </tr>
            ))}
            {!log?.length && <tr><td colSpan={4} className="px-3 py-8 text-center text-slate-400">Belum ada catatan.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
