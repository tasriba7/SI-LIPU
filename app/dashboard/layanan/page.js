import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABELS, STATUS_BADGE_CLASS } from "@/lib/statusSurat";

const FILTER = ["semua", "diajukan", "diproses", "selesai", "ditolak"];

export default async function DaftarPengajuanLayananPage({ searchParams }) {
  const sp = await searchParams;
  const status = sp?.status ?? "semua";
  const supabase = await createClient();

  let query = supabase
    .from("pengajuan_layanan")
    .select("id, kode_tracking, nama_pemohon, status, created_at, jenis_layanan_master(nama_layanan)")
    .order("created_at", { ascending: false });

  if (status !== "semua") {
    query = query.eq("status", status);
  }

  const { data: daftar } = await query;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-slate-800">Pengajuan Layanan</h1>
        <p className="text-sm text-slate-500">
          Semua pengajuan warga (jenis layanan apapun yang dibuat lewat Form
          Builder), terbaru di atas.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTER.map((f) => (
          <Link
            key={f}
            href={f === "semua" ? "/dashboard/layanan" : `/dashboard/layanan?status=${f}`}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              status === f
                ? "bg-navy text-white"
                : "border border-slate-200 bg-white text-slate-500 hover:border-navy-light/40"
            }`}
          >
            {f === "semua" ? "Semua" : STATUS_LABELS[f]}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Kode</th>
              <th className="px-4 py-3 font-medium">Jenis Layanan</th>
              <th className="px-4 py-3 font-medium">Pemohon</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Tanggal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(daftar ?? []).map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/layanan/${row.id}`}
                    className="font-mono text-navy hover:underline"
                  >
                    {row.kode_tracking}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {row.jenis_layanan_master?.nama_layanan}
                </td>
                <td className="px-4 py-3 text-slate-700">{row.nama_pemohon}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[row.status]}`}
                  >
                    {STATUS_LABELS[row.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400">
                  {new Date(row.created_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
              </tr>
            ))}
            {(daftar ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  Belum ada pengajuan{status !== "semua" ? ` dengan status "${STATUS_LABELS[status]}"` : ""}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
