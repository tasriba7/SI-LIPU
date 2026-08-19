import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { IconPlus } from "@/components/icons";

export default async function KependudukanPage({ searchParams }) {
  const sp = await searchParams;
  const cari = sp?.cari?.trim() || "";
  const supabase = await createClient();

  let query = supabase
    .from("warga")
    .select("id, nik, nama_lengkap, dusun, rt, rw, tanggal_lahir")
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
          href="/dashboard/kependudukan/baru"
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
              <th className="px-4 py-3 font-medium">Dusun / RT-RW</th>
              <th className="px-4 py-3 font-medium">Tanggal Lahir</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(daftar ?? []).map((w) => (
              <tr key={w.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-slate-600">{w.nik}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{w.nama_lengkap}</td>
                <td className="px-4 py-3 text-slate-500">
                  {w.dusun || "-"} {w.rt ? `· RT ${w.rt}` : ""} {w.rw ? `/RW ${w.rw}` : ""}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {w.tanggal_lahir
                    ? new Date(w.tanggal_lahir).toLocaleDateString("id-ID")
                    : "-"}
                </td>
              </tr>
            ))}
            {(daftar ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
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
