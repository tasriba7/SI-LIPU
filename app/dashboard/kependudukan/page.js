import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { IconPlus, IconUsers, IconSearch } from "@/components/icons";
import TombolHapusWarga from "./TombolHapusWarga";
import ImportWargaButton from "./ImportWargaButton";
import ExportWargaButton from "./ExportWargaButton";
import PilihJumlahTampil from "./PilihJumlahTampil";
import { ringkasKolomKosong } from "@/lib/kelengkapan";

function formatTanggal(t) {
  if (!t) return "-";
  const d = new Date(t);
  if (isNaN(d)) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function labelRole(role) {
  if (role === "kadus") return "Kadus";
  if (role === "ketua_rt") return "Ketua RT";
  return role || "";
}

const PILIHAN_TAMPIL = [25, 50, 100, 200];
const DEFAULT_TAMPIL = 50;
// PostgREST/Supabase membatasi 1000 baris per permintaan, jadi "Tampilkan semua"
// mengambil data bertahap per 1000 baris sampai habis.
const UKURAN_BATCH = 1000;

function buatUrl({ cari, kurang, tampil }) {
  const q = new URLSearchParams();
  if (cari) q.set("cari", cari);
  if (kurang) q.set("kurang", "1");
  if (tampil && tampil !== String(DEFAULT_TAMPIL)) q.set("tampil", tampil);
  const str = q.toString();
  return `/dashboard/kependudukan${str ? `?${str}` : ""}`;
}

export default async function KependudukanPage({ searchParams }) {
  const sp = await searchParams;
  const cari = sp?.cari?.trim() || "";
  const hanyaKurang = sp?.kurang === "1";
  const tampilSemua = sp?.tampil === "semua";
  const tampilParam = Number(sp?.tampil);
  const batas = tampilSemua
    ? null
    : PILIHAN_TAMPIL.includes(tampilParam)
      ? tampilParam
      : DEFAULT_TAMPIL;
  const tampilKey = tampilSemua ? "semua" : String(batas);
  const supabase = await createClient();

  // Dibaca dari view `warga_kelengkapan` (bukan tabel `warga` langsung) supaya
  // ikut dapat info siapa penginput dan kolom apa yang masih kosong. View ini
  // security_invoker = true, jadi tetap mengikuti RLS: Kadus/Ketua RT otomatis
  // hanya melihat wilayahnya, staf desa (admin) melihat semua wilayah —
  // termasuk yang diinput Kadus/Ketua RT, tanpa perlu langkah tambahan apa pun.
  function bangunQuery() {
    let q = supabase
      .from("warga_kelengkapan")
      .select(
        "id, nik, nama_lengkap, jenis_kelamin, dusun, rt, rw, tanggal_lahir, no_hp, status_dalam_kk, dibuat_oleh_nama, dibuat_oleh_role, jumlah_kosong, kolom_kosong",
        { count: "exact" }
      )
      .order("nama_lengkap")
      .order("id"); // urutan tambahan supaya paging antar batch stabil
    if (cari) {
      q = q.or(`nama_lengkap.ilike.%${cari}%,nik.ilike.%${cari}%`);
    }
    if (hanyaKurang) {
      q = q.gt("jumlah_kosong", 0);
    }
    return q;
  }

  let daftar = [];
  let jumlahCocok = 0;
  if (tampilSemua) {
    for (let dari = 0; ; dari += UKURAN_BATCH) {
      const { data, count } = await bangunQuery().range(
        dari,
        dari + UKURAN_BATCH - 1
      );
      if (typeof count === "number") jumlahCocok = count;
      daftar.push(...(data ?? []));
      if (!data || data.length < UKURAN_BATCH) break;
    }
  } else {
    const { data, count } = await bangunQuery().limit(batas);
    daftar = data ?? [];
    jumlahCocok = count ?? daftar.length;
  }

  const { count: totalWarga } = await supabase
    .from("warga")
    .select("id", { count: "exact", head: true });
  const { count: totalKurang } = await supabase
    .from("warga_kelengkapan")
    .select("id", { count: "exact", head: true })
    .gt("jumlah_kosong", 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-start lg:justify-between">
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

        <div className="flex flex-wrap items-center gap-2 lg:shrink-0 lg:justify-end">
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
        {hanyaKurang && <input type="hidden" name="kurang" value="1" />}
        {tampilKey !== String(DEFAULT_TAMPIL) && (
          <input type="hidden" name="tampil" value={tampilKey} />
        )}
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
            href={buatUrl({ kurang: hanyaKurang, tampil: tampilKey })}
            className="text-sm text-slate-400 hover:text-slate-600"
          >
            Reset pencarian
          </Link>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <PilihJumlahTampil
            nilai={tampilKey}
            opsi={[...PILIHAN_TAMPIL.map(String), "semua"].map((nilai) => ({
              value: nilai,
              label: nilai === "semua" ? "Semua data" : `${nilai} data`,
              href: buatUrl({ cari, kurang: hanyaKurang, tampil: nilai }),
            }))}
          />
        <Link
          href={buatUrl({ cari, kurang: !hanyaKurang, tampil: tampilKey })}
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
            hanyaKurang
              ? "border-amber-300 bg-amber-50 text-amber-700"
              : "border-slate-300 text-slate-500 hover:bg-slate-50"
          }`}
        >
          {hanyaKurang ? "✓ Menampilkan yang belum lengkap saja" : "Tampilkan yang belum lengkap saja"}
        </Link>
        </div>
      </form>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="max-h-[calc(100vh-17rem)] min-h-[320px] overflow-auto">
          <table className="w-full min-w-[1100px] border-separate border-spacing-0 text-[12px] leading-snug">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {[
                  ["No", "w-10 text-center"],
                  ["NIK", ""],
                  ["Nama Lengkap", ""],
                  ["L/P", "w-10 text-center"],
                  ["Tgl. Lahir", ""],
                  ["Status KK", ""],
                  ["Dusun", ""],
                  ["RT/RW", "text-center"],
                  ["No. HP", ""],
                  ["Ditambahkan Oleh", ""],
                  ["Kelengkapan", ""],
                  ["Aksi", "text-right"],
                ].map(([label, cls]) => (
                  <th
                    key={label}
                    className={`sticky top-0 z-10 whitespace-nowrap border-b border-slate-200 bg-slate-100 px-3 py-2.5 ${cls}`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-slate-600">
              {daftar.map((w, i) => (
                <tr
                  key={w.id}
                  className="odd:bg-white even:bg-slate-50/60 hover:bg-navy/5"
                >
                  <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2 text-center tabular-nums text-slate-400">
                    {i + 1}
                  </td>
                  <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2 font-mono text-[11.5px] tabular-nums text-slate-700">
                    {w.nik}
                  </td>
                  <td className="max-w-[240px] truncate border-b border-slate-100 px-3 py-2 font-medium text-slate-800">
                    <span title={w.nama_lengkap}>{w.nama_lengkap}</span>
                  </td>
                  <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2 text-center">
                    {w.jenis_kelamin === "L" || w.jenis_kelamin === "P" ? (
                      <span
                        className={`inline-block w-5 rounded text-center text-[11px] font-semibold ${
                          w.jenis_kelamin === "L"
                            ? "bg-sky-100 text-sky-700"
                            : "bg-pink-100 text-pink-700"
                        }`}
                      >
                        {w.jenis_kelamin}
                      </span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2 tabular-nums">
                    {formatTanggal(w.tanggal_lahir)}
                  </td>
                  <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2">
                    {w.status_dalam_kk ? (
                      <span
                        className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                          w.status_dalam_kk === "Kepala Keluarga"
                            ? "bg-gold/20 text-navy"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {w.status_dalam_kk}
                      </span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2">
                    {w.dusun || "-"}
                  </td>
                  <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2 text-center tabular-nums">
                    {w.rt || w.rw ? `${w.rt || "-"} / ${w.rw || "-"}` : "-"}
                  </td>
                  <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2 tabular-nums">
                    {w.no_hp || "-"}
                  </td>
                  <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2">
                    {w.dibuat_oleh_nama ? (
                      <span title={labelRole(w.dibuat_oleh_role)}>
                        {w.dibuat_oleh_nama}
                        {w.dibuat_oleh_role && (
                          <span className="ml-1 text-[11px] text-slate-400">
                            ({labelRole(w.dibuat_oleh_role)})
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-slate-300">Data lama / impor</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2">
                    {w.jumlah_kosong > 0 ? (
                      <span
                        className="cursor-help rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-700"
                        title={`Kolom belum diisi: ${ringkasKolomKosong(w.kolom_kosong, 20)}`}
                      >
                        Kurang {w.jumlah_kosong}
                      </span>
                    ) : (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700">
                        Lengkap
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/dashboard/kependudukan/${w.id}/edit`}
                        className="text-[12px] font-medium text-navy hover:underline"
                      >
                        Edit
                      </Link>
                      <TombolHapusWarga id={w.id} nama={w.nama_lengkap} />
                    </div>
                  </td>
                </tr>
              ))}
              {daftar.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-16 text-center">
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
        Menampilkan{" "}
        <span className="font-semibold text-slate-600">
          {daftar.length.toLocaleString("id-ID")}
        </span>{" "}
        dari{" "}
        <span className="font-semibold text-slate-600">
          {jumlahCocok.toLocaleString("id-ID")}
        </span>{" "}
        data{cari || hanyaKurang ? " (sesuai filter)" : ""}. Gunakan pilihan "Tampilkan" di atas untuk mengatur jumlah baris, atau
        pencarian untuk mempersempit. Tombol "Ekspor ke Excel" mengunduh
        seluruh data. Untuk menambah banyak data sekaligus, gunakan tombol
        "Impor Data Penduduk" di atas.
      </p>
    </div>
  );
}
