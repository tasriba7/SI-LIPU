import { createClient } from "@/lib/supabase/server";
import { AKSI_LABEL, rapikanDusun } from "@/lib/pilkades";
import { JudulHalaman, Kartu } from "@/components/pilkades/UI";

export const metadata = { title: "Riwayat Aktivitas Pilkades" };

export default async function RiwayatPage() {
  const supabase = await createClient();
  const { data: log } = await supabase
    .from("pilkades_log")
    .select("id, aksi, detail, oleh_nama, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <JudulHalaman
        judul="Riwayat Aktivitas"
        penjelasan="Catatan siapa melakukan apa dan kapan. Menampilkan 200 catatan terbaru: pengambilan data, penetapan DPS/DPT, dan pencetakan."
      />
      <div className="overflow-x-auto rounded-xl border border-sky-100 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-sky-50 text-sm font-bold text-sky-900">
            <tr>
              <th className="px-4 py-3">Waktu</th>
              <th className="px-4 py-3">Oleh</th>
              <th className="px-4 py-3">Kegiatan</th>
              <th className="px-4 py-3">Keterangan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(log ?? []).map((l) => (
              <tr key={l.id} className="align-top">
                <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                  {new Date(l.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Makassar" })}
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">{l.oleh_nama ?? "-"}</td>
                <td className="px-4 py-3 font-semibold text-sky-900">{AKSI_LABEL[l.aksi] ?? l.aksi}</td>
                <td className="px-4 py-3 text-slate-800">{rapikanDusun(l.detail)}</td>
              </tr>
            ))}
            {!log?.length && <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-500">Belum ada catatan.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
