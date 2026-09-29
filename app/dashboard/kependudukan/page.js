import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { IconPlus, IconUsers, IconSearch } from "@/components/icons";
import TombolHapusWarga from "./TombolHapusWarga";
import ImportWargaButton from "./ImportWargaButton";
import ExportWargaButton from "./ExportWargaButton";
import { ringkasKolomKosong } from "@/lib/kelengkapan";

function inisial(nama) {
  if (!nama) return "?";
  const kata = nama.trim().split(/\s+/);
  const depan = kata[0]?.[0] || "";
  const belakang = kata.length > 1 ? kata[kata.length - 1][0] : "";
  return (depan + belakang).toUpperCase();
}

export default async function KependudukanPage({ searchParams }) {
  const sp = await searchParams;
  const cari = sp?.cari?.trim() || "";
  const hanyaKurang = sp?.kurang === "1";
  const supabase = await createClient();

  // Dibaca dari view `warga_kelengkapan` (bukan tabel `warga` langsung) supaya
  // ikut dapat info siapa penginput dan kolom apa yang masih kosong. View ini
  // security_invoker = true, jadi tetap mengikuti RLS: Kadus/Ketua RT otomatis
  // hanya melihat wilayahnya, staf desa (admin) melihat semua wilayah —
  // termasuk yang diinput Kadus/Ketua RT, tanpa perlu langkah tambahan apa pun.
  let query = supabase
    .from("warga_kelengkapan")
    .select(
      "id, nik, nama_lengkap, jenis_kelamin, dusun, rt, rw, tanggal_lahir, no_hp, status_dalam_kk, dibuat_oleh_nama, dibuat_oleh_role, jumlah_kosong, kolom_kosong"
    )
    .order("nama_lengkap")
    .limit(50);

  if (cari) {
    query = query.or(`nama_lengkap.ilike.%${cari}%,nik.ilike.%${cari}%`);
  }
  if (hanyaKurang) {
    query = query.gt("jumlah_kosong", 0);
  }

  const { data: daftar } = await query;
  const { count: totalWarga } = await supabase
    .from("warga")
    .select("id", { count: "exact", head: true });
  const { count: totalKurang } = await supabase
    .from("warga_kelengkapan")
    .select("id", { count: "exact", head: true })
    .gt("jumlah_kosong", 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy/10 text-navy">
            <IconUsers className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Data Kependudukan</h1>
            <p className="mt-0.5 max-w-xl text-sm text-slate-500">
              Master data warga — dipakai semua modul (Ajukan Layanan, dst) untuk
              auto-isi data lewat NIK + Tanggal Lahir.
            </p>
            {typeof totalWarga === "number" && (
              <p className="mt-1.5 text-xs font-medium text-navy">
                {totalWarga.toLocaleString("id-ID")} warga terdaftar
              </p>
            )}
            {typeof totalKurang === "number" && totalKurang > 0 && (
              <Link
                href="/dashboard/kependudukan?kurang=1"
                className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-600 hover:underline"
              >
                ⚠ {totalKurang.toLocaleString("id-ID")} data belum lengkap — klik untuk lihat
              </Link>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <Link
            href="/dashboard/kependudukan/kartu-keluarga"
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            <IconUsers className="h-4 w-4" />
            Kartu Keluarga
          </Link>
          <ImportWargaButton />
          <ExportWargaButton cari={cari} />
          <Link
            href="/dashboard/kependudukan/tambah"
            className="flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light"
          >
            <IconPlus className="h-4 w-4" />
            Tambah Warga
          </Link>
        </div>
      </div>

      {/* Search */}
      <form className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            name="cari"
            defaultValue={cari}
            placeholder="Cari nama atau NIK..."
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-navy"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          Cari
        </button>
        {cari && (
          <Link
            href="/dashboard/kependudukan"
            className="text-sm text-slate-400 hover:text-slate-600"
          >
            Reset pencarian
          </Link>
        )}
        <Link
          href={
            hanyaKurang
              ? `/dashboard/kependudukan${cari ? `?cari=${encodeURIComponent(cari)}` : ""}`
              : `/dashboard/kependudukan?kurang=1${cari ? `&cari=${encodeURIComponent(cari)}` : ""}`
          }
          className={`ml-auto rounded-lg border px-3 py-1.5 text-xs font-medium ${
            hanyaKurang
              ? "border-amber-300 bg-amber-50 text-amber-700"
              : "border-slate-300 text-slate-500 hover:bg-slate-50"
          }`}
        >
          {hanyaKurang ? "✓ Menampilkan yang belum lengkap saja" : "Tampilkan yang belum lengkap saja"}
        </Link>
      </form>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">NIK</th>
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 font-medium">Status KK</th>
                <th className="px-4 py-3 font-medium">Dusun / RT-RW</th>
                <th className="px-4 py-3 font-medium">Tanggal Lahir</th>
                <th className="px-4 py-3 font-medium">No. HP</th>
                <th className="px-4 py-3 font-medium">Ditambahkan oleh</th>
                <th className="px-4 py-3 font-medium">Kelengkapan</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(daftar ?? []).map((w) => (
                <tr key={w.id} className="transition hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-mono text-slate-600">{w.nik}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy/10 text-xs font-semibold text-navy">
                        {inisial(w.nama_lengkap)}
                      </div>
                      <div>
                        <p className="font-medium leading-tight text-slate-800">
                          {w.nama_lengkap}
                        </p>
                        {w.jenis_kelamin && (
                          <p className="text-[11px] leading-tight text-slate-400">
                            {w.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan"}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
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
                  <td className="px-4 py-3 text-slate-500">
                    {w.dibuat_oleh_nama ? (
                      <>
                        <p className="leading-tight text-slate-700">{w.dibuat_oleh_nama}</p>
                        {w.dibuat_oleh_role && (
                          <p className="text-[11px] leading-tight text-slate-400">
                            {w.dibuat_oleh_role === "kadus"
                              ? "Kadus"
                              : w.dibuat_oleh_role === "ketua_rt"
                                ? "Ketua RT"
                                : w.dibuat_oleh_role}
                          </p>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-slate-300">Data lama / impor</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {w.jumlah_kosong > 0 ? (
                      <span
                        className="cursor-help rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700"
                        title={`Kolom belum diisi: ${ringkasKolomKosong(w.kolom_kosong, 20)}`}
                      >
                        Kurang {w.jumlah_kosong} kolom
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        Lengkap
                      </span>
                    )}
                  </td>
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
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <div className="mx-auto flex max-w-xs flex-col items-center gap-2 text-slate-400">
                      <IconUsers className="h-8 w-8" />
                      <p className="text-sm">
                        {cari ? `Tidak ada hasil untuk "${cari}".` : "Belum ada data warga."}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Menampilkan maksimal 50 hasil. Gunakan pencarian untuk mempersempit,
        atau tombol "Ekspor ke Excel" untuk mengunduh seluruh data. Untuk
        menambah banyak data sekaligus, gunakan tombol "Impor Data Penduduk"
        di atas.
      </p>
    </div>
  );
}
