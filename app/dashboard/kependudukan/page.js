import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { IconPlus } from "@/components/icons";
import TombolHapusWarga from "./TombolHapusWarga";

export default async function KependudukanPage({ searchParams }) {
  const sp = await searchParams;
  const cari = sp?.cari?.trim() || "";
  const supabase = await createClient();

  let query = supabase
    .from("warga")
    .select("id, nik, nama_lengkap, dusun, rt, rw, tanggal_lahir, no_hp, status_dalam_kk")
    .order("nama_lengkap")
    .limit(50);

  if (cari) {
    query = query.or(`nama_lengkap.ilike.%${cari}%,nik.ilike.%${cari}%`);
  }

  const { data: daftar } = await query;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Data Kependudukan</h1>
          <p className="text-sm text-slate-500">
            Master data warga — dipakai semua modul (Ajukan Layanan, dst) untuk
            auto-isi data lewat NIK + Tanggal Lahir.
          </p>
        </div>
        <Link
          href="/dashboard/kependudukan/tambah"
          className="flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light"
        >
          <IconPlus className="h-4 w-4" />
          Tambah Warga
        </Link>
      </div>

      <form className="flex gap-2">
        <input
          type="text"
          name="cari"
          defaultValue={cari}
          placeholder="Cari nama atau NIK..."
          className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
        />
        <button
          type="submit"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          Cari
        </button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">NIK</th>
              <th className="px-4 py-3 font-medium">Nama</th>
              <th className="px-4 py-3 font-medium">Status KK</th>
              <th className="px-4 py-3 font-medium">Dusun / RT-RW</th>
              <th className="px-4 py-3 font-medium">Tanggal Lahir</th>
              <th className="px-4 py-3 font-medium">No. HP</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(daftar ?? []).map((w) => (
              <tr key={w.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-slate-600">{w.nik}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{w.nama_lengkap}</td>
                <td className="px-4 py-3">
                  {w.status_dalam_kk ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        w.status_dalam_kk === "Kepala Keluarga"
                          ? "bg-gold/15 text-navy"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {w.status_dalam_kk}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-300">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {w.dusun || "-"} {w.rt ? `· RT ${w.rt}` : ""} {w.rw ? `/RW ${w.rw}` : ""}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {w.tanggal_lahir
                    ? new Date(w.tanggal_lahir).toLocaleDateString("id-ID")
                    : "-"}
                </td>
                <td className="px-4 py-3 text-slate-500">{w.no_hp || "-"}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={`/dashboard/kependudukan/${w.id}/edit`}
                      className="text-xs font-medium text-navy hover:underline"
                    >
                      Edit
                    </Link>
                    <TombolHapusWarga id={w.id} nama={w.nama_lengkap} />
                  </div>
                </td>
              </tr>
            ))}
            {(daftar ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  {cari ? `Tidak ada hasil untuk "${cari}".` : "Belum ada data warga."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400">
        Menampilkan maksimal 50 hasil. Gunakan pencarian untuk mempersempit.
        Import massal dari Excel belum tersedia — lihat catatan di
        docs/ROADMAP.md.
      </p>
    </div>
  );
}
