import { ROLE_LABELS } from "@/lib/roles";
import FormCari from "@/components/FormCari";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  IconPlus,
  IconUsers,
  IconSearch,
  IconCheck,
  IconGenderBalance,
} from "@/components/icons";
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
  return ROLE_LABELS[role] ?? role ?? "";
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
        "id, nik, no_kk, nama_lengkap, jenis_kelamin, dusun, rt, rw, tanggal_lahir, no_hp, status_dalam_kk, dibuat_oleh_nama, dibuat_oleh_role, jumlah_kosong, kolom_kosong",
        { count: "exact" }
      )
      .eq("status_kependudukan", "aktif") // yang meninggal/pindah ada di Mutasi Penduduk
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
    .select("id", { count: "exact", head: true })
    .eq("status_kependudukan", "aktif");
  const { count: totalKurang } = await supabase
    .from("warga_kelengkapan")
    .select("id", { count: "exact", head: true })
    .eq("status_kependudukan", "aktif")
    .gt("jumlah_kosong", 0);

  const { count: totalLaki } = await supabase
    .from("warga")
    .select("id", { count: "exact", head: true })
    .eq("status_kependudukan", "aktif")
    .eq("jenis_kelamin", "L");
  const { count: totalPerempuan } = await supabase
    .from("warga")
    .select("id", { count: "exact", head: true })
    .eq("status_kependudukan", "aktif")
    .eq("jenis_kelamin", "P");

  const fmt = (n) => (typeof n === "number" ? n.toLocaleString("id-ID") : "-");
  const jumlahLengkap =
    typeof totalWarga === "number" && typeof totalKurang === "number"
      ? Math.max(totalWarga - totalKurang, 0)
      : null;

  return (
    <div className="space-y-5">
      {/* Banner judul — tombol Tambah selalu terlihat di kanan atas */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy-dark via-navy to-navy-light p-5 text-white shadow-sm sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-gold/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-seablue/20 blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold text-navy-dark shadow-md shadow-black/20">
              <IconUsers className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Data Kependudukan</h1>
              <p className="mt-1 text-sm text-white/70">
                Master data warga yang dipakai semua modul untuk auto-isi lewat NIK + Tanggal Lahir.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/kependudukan/tambah"
            className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold to-gold-light px-5 py-2.5 text-sm font-semibold text-navy-dark shadow-lg shadow-black/20 transition hover:brightness-105"
          >
            <IconPlus className="h-4 w-4" />
            Tambah Warga
          </Link>
        </div>
      </div>

      {/* Kartu ringkasan */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-sky-700">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100">
              <IconUsers className="h-4 w-4" />
            </span>
            Warga aktif
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-navy">{fmt(totalWarga)}</p>
        </div>
        <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-violet-700">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100">
              <IconGenderBalance className="h-4 w-4" />
            </span>
            Laki-laki / Perempuan
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-slate-800">
            <span className="text-sky-600">{fmt(totalLaki)}</span>
            <span className="mx-1.5 text-slate-300">/</span>
            <span className="text-pink-600">{fmt(totalPerempuan)}</span>
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100">
              <IconCheck className="h-4 w-4" />
            </span>
            Data lengkap
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-700">{fmt(jumlahLengkap)}</p>
        </div>
        <Link
          href="/dashboard/kependudukan?kurang=1"
          className="group rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 transition hover:border-amber-300 hover:shadow-sm"
        >
          <div className="flex items-center gap-2 text-xs font-medium text-amber-700">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-sm">⚠</span>
            Belum lengkap
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-amber-600">{fmt(totalKurang)}</p>
          <p className="mt-0.5 text-[11px] text-amber-700/70 group-hover:underline">Klik untuk lihat</p>
        </Link>
      </div>

      {/* Menu aksi */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <Link
          href="/dashboard/kependudukan/kartu-keluarga"
          className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100"
        >
          <IconUsers className="h-4 w-4" />
          Kartu Keluarga
        </Link>
        <Link
          href="/dashboard/kependudukan/mutasi"
          className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100"
        >
          Mutasi Penduduk
        </Link>
        <ImportWargaButton />
        <ExportWargaButton cari={cari} />
      </div>

      {/* Pencarian & filter */}
      <FormCari className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        {hanyaKurang && <input type="hidden" name="kurang" value="1" />}
        {tampilKey !== String(DEFAULT_TAMPIL) && (
          <input type="hidden" name="tampil" value={tampilKey} />
        )}
        <div className="relative min-w-[200px] flex-1 sm:max-w-sm">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            name="cari"
            defaultValue={cari}
            placeholder="Cari nama atau NIK..."
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-navy focus:ring-2 focus:ring-navy/10"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white transition hover:bg-navy-light"
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
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              hanyaKurang
                ? "border-amber-300 bg-amber-100 text-amber-800"
                : "border-slate-300 text-slate-500 hover:bg-slate-50"
            }`}
          >
            {hanyaKurang ? "✓ Hanya yang belum lengkap" : "Tampilkan yang belum lengkap saja"}
          </Link>
        </div>
      </FormCari>

      {/* Tabel — dirapatkan supaya muat tanpa digeser di layar laptop */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="max-h-[72vh] min-h-[320px] overflow-auto">
          <table className="w-full min-w-[820px] border-separate border-spacing-0 text-[12.5px] leading-snug">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-white">
                {[
                  ["No", "w-10 text-center", ""],
                  ["Nama / NIK", "", ""],
                  ["Tgl. Lahir", "", ""],
                  ["Status KK", "", ""],
                  ["Wilayah", "", ""],
                  ["No. HP", "", "hidden 2xl:table-cell"],
                  ["Ditambahkan Oleh", "", "hidden 2xl:table-cell"],
                  ["Kelengkapan", "", ""],
                  ["Aksi", "text-right", ""],
                ].map(([label, cls, tampil]) => (
                  <th
                    key={label}
                    className={`sticky top-0 z-10 whitespace-nowrap border-b-2 border-gold bg-navy px-3 py-3 ${cls} ${tampil}`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-slate-600">
              {daftar.map((w, i) => (
                <tr key={w.id} className="odd:bg-white even:bg-sky-50/40 hover:bg-sky-50">
                  <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2.5 text-center tabular-nums text-slate-400">
                    {i + 1}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      {w.jenis_kelamin === "L" || w.jenis_kelamin === "P" ? (
                        <span
                          title={w.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan"}
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                            w.jenis_kelamin === "L"
                              ? "bg-sky-100 text-sky-700"
                              : "bg-pink-100 text-pink-700"
                          }`}
                        >
                          {w.jenis_kelamin}
                        </span>
                      ) : (
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-300">
                          -
                        </span>
                      )}
                      <div className="min-w-0">
                        <p
                          className="max-w-[260px] truncate font-semibold text-slate-800"
                          title={w.nama_lengkap}
                        >
                          {w.nama_lengkap}
                        </p>
                        <p className="font-mono text-[11px] tabular-nums text-slate-400">{w.nik}</p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2.5 tabular-nums">
                    {formatTanggal(w.tanggal_lahir)}
                  </td>
                  <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2.5">
                    {w.status_dalam_kk ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          w.status_dalam_kk === "Kepala Keluarga"
                            ? "bg-gold/25 text-navy"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {w.status_dalam_kk}
                      </span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2.5">
                    <span className="rounded-md bg-teal-50 px-1.5 py-0.5 text-[11.5px] font-medium text-teal-700">
                      {w.dusun || "-"}
                    </span>
                    <span className="ml-1.5 text-[11.5px] tabular-nums text-slate-400">
                      {w.rt || w.rw ? `RT ${w.rt || "-"}/${w.rw || "-"}` : ""}
                    </span>
                  </td>
                  <td className="hidden whitespace-nowrap border-b border-slate-100 px-3 py-2.5 tabular-nums 2xl:table-cell">
                    {w.no_hp || "-"}
                  </td>
                  <td className="hidden whitespace-nowrap border-b border-slate-100 px-3 py-2.5 2xl:table-cell">
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
                  <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2.5">
                    {w.jumlah_kosong > 0 ? (
                      <span
                        className="cursor-help rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700"
                        title={`Kolom belum diisi: ${ringkasKolomKosong(w.kolom_kosong, 20)}`}
                      >
                        Kurang {w.jumlah_kosong}
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        Lengkap
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {w.no_kk && (
                        <Link
                          href={`/dashboard/kependudukan/keluarga/${w.no_kk}?warga=${w.id}`}
                          className="rounded-md bg-indigo-50 px-2 py-1 text-[12px] font-medium text-indigo-700 hover:bg-indigo-100"
                          title="Lihat seluruh anggota keluarga ini"
                        >
                          Keluarga
                        </Link>
                      )}
                      <Link
                        href={`/dashboard/kependudukan/${w.id}/edit`}
                        className="rounded-md bg-navy/10 px-2 py-1 text-[12px] font-medium text-navy hover:bg-navy/20"
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
