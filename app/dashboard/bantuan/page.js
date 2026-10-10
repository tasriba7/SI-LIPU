import Link from "next/link";
import FormCari from "@/components/FormCari";
import { createClient } from "@/lib/supabase/server";
import { pastikanAdmin } from "@/lib/akses";
import HalamanTerbatas from "@/components/dashboard/HalamanTerbatas";
import { IconHeartHandshake, IconPlus, IconSearch } from "@/components/icons";
import {
  KATEGORI_BADGE_CLASS,
  KATEGORI_LABEL,
  labelPeriode,
  labelWilayahWarga,
} from "@/lib/bantuan";
import TombolTampil from "./TombolTampil";
import TampilMassal from "./TampilMassal";
import TombolHapusPenerima from "./TombolHapusPenerima";

export const metadata = { title: "Bantuan Desa" };

const BATAS_TABEL = 100;
const UKURAN_BATCH = 1000; // PostgREST membatasi 1000 baris per permintaan
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function buatUrl({ jenis, periode, cari, tampil }) {
  const q = new URLSearchParams();
  if (jenis) q.set("jenis", jenis);
  if (periode !== undefined && periode !== null && periode !== "") q.set("periode", periode);
  if (cari) q.set("cari", cari);
  if (tampil) q.set("tampil", tampil);
  const str = q.toString();
  return `/dashboard/bantuan${str ? `?${str}` : ""}`;
}

export default async function BantuanPage({ searchParams }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const akses = await pastikanAdmin(supabase);
  if (akses.error) return <HalamanTerbatas />;

  const jenisFilter = UUID_RE.test(sp?.jenis ?? "") ? sp.jenis : "";
  const periodeFilter = typeof sp?.periode === "string" ? sp.periode : null;
  const cari = (sp?.cari ?? "")
    .toString()
    .replace(/[,()*%_\\"']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  const tampilFilter = ["ya", "tidak"].includes(sp?.tampil) ? sp.tampil : "";

  // Daftar jenis bantuan (untuk filter & nama program).
  const { data: daftarJenis } = await supabase
    .from("jenis_bantuan")
    .select("id, nama, kategori, aktif, urutan")
    .order("urutan")
    .order("nama");
  const jenisPerId = Object.fromEntries((daftarJenis ?? []).map((j) => [j.id, j]));

  // Ringkasan per program (jenis + periode): diambil bertahap per 1000 baris.
  const semuaBaris = [];
  for (let dari = 0; ; dari += UKURAN_BATCH) {
    const { data } = await supabase
      .from("penerima_bantuan")
      .select("jenis_bantuan_id, periode, tampil_publik")
      .order("id")
      .range(dari, dari + UKURAN_BATCH - 1);
    semuaBaris.push(...(data ?? []));
    if (!data || data.length < UKURAN_BATCH) break;
  }
  const programMap = new Map();
  for (const b of semuaBaris) {
    const kunci = `${b.jenis_bantuan_id}||${b.periode}`;
    const p = programMap.get(kunci) ?? {
      jenisId: b.jenis_bantuan_id,
      periode: b.periode,
      jumlah: 0,
      tampil: 0,
    };
    p.jumlah += 1;
    if (b.tampil_publik) p.tampil += 1;
    programMap.set(kunci, p);
  }
  const program = [...programMap.values()].sort((a, b) => {
    const ua = jenisPerId[a.jenisId]?.urutan ?? 999;
    const ub = jenisPerId[b.jenisId]?.urutan ?? 999;
    return ua - ub || b.periode.localeCompare(a.periode);
  });

  // Tabel penerima (dengan filter).
  let q = supabase
    .from("penerima_bantuan")
    .select(
      "id, periode, keterangan, tampil_publik, created_at, warga!inner(nama_lengkap, nik, dusun, rt, rw), jenis_bantuan(id, nama, kategori)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .limit(BATAS_TABEL);
  if (jenisFilter) q = q.eq("jenis_bantuan_id", jenisFilter);
  if (periodeFilter !== null) q = q.eq("periode", periodeFilter);
  if (tampilFilter) q = q.eq("tampil_publik", tampilFilter === "ya");
  if (cari) q = q.ilike("warga.nama_lengkap", `%${cari}%`);

  const { data: daftar, count, error } = await q;
  if (error) console.error("Gagal memuat penerima_bantuan:", error);
  const baris = daftar ?? [];
  const jumlahCocok = count ?? baris.length;

  const totalPenerima = semuaBaris.length;
  const totalTampil = semuaBaris.filter((b) => b.tampil_publik).length;
  const adaFilter = !!(jenisFilter || periodeFilter !== null || cari || tampilFilter);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy/10 text-navy">
            <IconHeartHandshake className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Bantuan Desa</h1>
            <p className="mt-0.5 max-w-xl text-sm text-slate-500">
              Catat siapa saja yang menerima bantuan dan jenis bantuannya (nama diambil dari Data
              Kependudukan). Atur apakah tiap penerima <strong>tampil</strong> atau{" "}
              <strong>disembunyikan</strong> di Panel Warga &rsaquo; Cek Bantuan.
            </p>
            <p className="mt-1.5 text-xs font-medium text-navy">
              {totalPenerima.toLocaleString("id-ID")} penerima tercatat ·{" "}
              {totalTampil.toLocaleString("id-ID")} tampil ke warga
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:shrink-0 lg:justify-end">
          <Link
            href="/layanan/bantuan"
            target="_blank"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Lihat tampilan warga
          </Link>
          <Link
            href="/dashboard/bantuan/jenis"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Kelola Jenis Bantuan
          </Link>
          <Link
            href="/dashboard/bantuan/tambah"
            className="flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light"
          >
            <IconPlus className="h-4 w-4" />
            Tambah Penerima
          </Link>
        </div>
      </div>

      {/* Ringkasan per program */}
      {program.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Program bantuan</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {program.map((p) => {
              const jenis = jenisPerId[p.jenisId];
              const nama = jenis?.nama ?? "Bantuan";
              const sedangDifilter =
                jenisFilter === p.jenisId && periodeFilter !== null && periodeFilter === p.periode;
              return (
                <div
                  key={`${p.jenisId}-${p.periode}`}
                  className={`rounded-xl border bg-white p-4 ${
                    sedangDifilter ? "border-navy ring-1 ring-navy/20" : "border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800" title={nama}>
                        {nama}
                      </p>
                      <p className="text-xs text-slate-500">{labelPeriode(p.periode)}</p>
                    </div>
                    {jenis && (
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          KATEGORI_BADGE_CLASS[jenis.kategori] ?? KATEGORI_BADGE_CLASS.lainnya
                        }`}
                      >
                        {KATEGORI_LABEL[jenis.kategori] ?? jenis.kategori}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">{p.jumlah}</span> penerima ·{" "}
                    <span className="font-semibold text-emerald-700">{p.tampil}</span> tampil ke warga
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <TampilMassal
                      jenisId={p.jenisId}
                      periode={p.periode}
                      nama={`${nama} (${labelPeriode(p.periode)})`}
                      jumlah={p.jumlah}
                    />
                    <Link
                      href={buatUrl({ jenis: p.jenisId, periode: p.periode })}
                      className="text-xs font-medium text-navy hover:underline"
                    >
                      Lihat daftar
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Filter */}
      <FormCari className="flex flex-wrap items-center gap-2">
        {periodeFilter !== null && <input type="hidden" name="periode" value={periodeFilter} />}
        <select
          name="jenis"
          defaultValue={jenisFilter}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
        >
          <option value="">Semua jenis bantuan</option>
          {(daftarJenis ?? []).map((j) => (
            <option key={j.id} value={j.id}>
              {j.nama}
              {j.aktif ? "" : " (nonaktif)"}
            </option>
          ))}
        </select>
        <select
          name="tampil"
          defaultValue={tampilFilter}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
        >
          <option value="">Semua status tampil</option>
          <option value="ya">Tampil ke warga</option>
          <option value="tidak">Disembunyikan</option>
        </select>
        <div className="relative w-full max-w-xs">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            name="cari"
            defaultValue={cari}
            placeholder="Cari nama penerima..."
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-navy"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          Terapkan
        </button>
        {adaFilter && (
          <Link href="/dashboard/bantuan" className="text-sm text-slate-400 hover:text-slate-600">
            Reset filter
          </Link>
        )}
      </FormCari>

      {/* Tabel penerima */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-separate border-spacing-0 text-[12px] leading-snug">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {[
                  ["No", "w-10 text-center"],
                  ["Nama Penerima", ""],
                  ["Wilayah", ""],
                  ["Jenis Bantuan", ""],
                  ["Periode", ""],
                  ["Tampil ke Warga", ""],
                  ["Aksi", "text-right"],
                ].map(([label, cls]) => (
                  <th
                    key={label}
                    className={`whitespace-nowrap border-b border-slate-200 bg-slate-100 px-3 py-2.5 ${cls}`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-slate-600">
              {baris.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-12 text-center text-sm text-slate-400">
                    {adaFilter
                      ? "Tidak ada penerima yang cocok dengan filter."
                      : 'Belum ada penerima bantuan. Klik "Tambah Penerima" untuk mulai mencatat.'}
                  </td>
                </tr>
              ) : (
                baris.map((b, i) => (
                  <tr key={b.id} className="odd:bg-white even:bg-slate-50/60 hover:bg-navy/5">
                    <td className="border-b border-slate-100 px-3 py-2 text-center tabular-nums text-slate-400">
                      {i + 1}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-2">
                      <p className="font-medium text-slate-800">{b.warga?.nama_lengkap}</p>
                      <p className="font-mono text-[11px] text-slate-400">{b.warga?.nik}</p>
                    </td>
                    <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2">
                      {labelWilayahWarga(b.warga)}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-2">
                      <p className="text-slate-700">{b.jenis_bantuan?.nama}</p>
                      {b.keterangan && (
                        <p className="text-[11px] text-slate-400">{b.keterangan}</p>
                      )}
                    </td>
                    <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2">
                      {labelPeriode(b.periode)}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-2">
                      <TombolTampil id={b.id} tampil={b.tampil_publik} />
                    </td>
                    <td className="border-b border-slate-100 px-3 py-2 text-right">
                      <TombolHapusPenerima
                        id={b.id}
                        nama={b.warga?.nama_lengkap ?? "penerima ini"}
                        bantuan={b.jenis_bantuan?.nama ?? "bantuan"}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {jumlahCocok > BATAS_TABEL && (
          <p className="border-t border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Menampilkan {BATAS_TABEL} penerima terbaru dari {jumlahCocok.toLocaleString("id-ID")}.
            Gunakan filter di atas untuk mempersempit.
          </p>
        )}
      </div>
    </div>
  );
}
