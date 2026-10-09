import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/roles";
import { LABEL_MUTASI } from "@/lib/statusPenduduk";
import { IconUsers } from "@/components/icons";
import TombolBatalkanMutasi from "./TombolBatalkanMutasi";

const JENIS = ["meninggal", "pindah_keluar", "datang"];
const BATAS_TAMPIL = 500;

function formatTanggal(t) {
  if (!t) return "-";
  const d = new Date(t);
  if (isNaN(d)) return "-";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function buatUrl({ tahun, jenis }) {
  const q = new URLSearchParams();
  if (tahun) q.set("tahun", tahun);
  if (jenis && jenis !== "semua") q.set("jenis", jenis);
  const str = q.toString();
  return `/dashboard/kependudukan/mutasi${str ? `?${str}` : ""}`;
}

const WARNA_JENIS = {
  meninggal: "bg-slate-200 text-slate-700",
  pindah_keluar: "bg-amber-100 text-amber-800",
  datang: "bg-emerald-100 text-emerald-800",
};

export default async function MutasiPendudukPage({ searchParams }) {
  const sp = await searchParams;
  const tahunIni = String(new Date().getFullYear());
  const tahun = sp?.tahun === "semua" ? "semua" : /^\d{4}$/.test(sp?.tahun ?? "") ? sp.tahun : tahunIni;
  const jenis = JENIS.includes(sp?.jenis) ? sp.jenis : "semua";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profil } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  const bisaBatalkan = isAdminRole(profil?.role);

  function saring(q) {
    if (tahun !== "semua") q = q.gte("tanggal", `${tahun}-01-01`).lte("tanggal", `${tahun}-12-31`);
    return q;
  }

  let daftarQuery = saring(
    supabase
      .from("mutasi_penduduk")
      .select(
        "id, jenis, tanggal, keterangan, surat_terbit_id, dicatat_oleh_nama, dibatalkan_pada, alasan_batal, warga(id, nik, nama_lengkap, dusun, rt, rw)"
      )
  )
    .order("tanggal", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(BATAS_TAMPIL);
  if (jenis !== "semua") daftarQuery = daftarQuery.eq("jenis", jenis);

  const [daftarHasil, ...hitung] = await Promise.all([
    daftarQuery,
    ...JENIS.map((j) =>
      saring(
        supabase.from("mutasi_penduduk").select("id", { count: "exact", head: true })
      )
        .eq("jenis", j)
        .is("dibatalkan_pada", null)
    ),
  ]);

  const adaGalat = !!daftarHasil.error;
  const daftar = daftarHasil.data ?? [];
  const jumlah = Object.fromEntries(JENIS.map((j, i) => [j, hitung[i]?.count ?? 0]));

  return (
    <div className="space-y-4">
      <div>
        <Link href="/dashboard/kependudukan" className="text-sm text-slate-400 hover:text-slate-600">
          &larr; Kembali ke daftar warga
        </Link>
        <div className="mt-2 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy/10 text-navy">
            <IconUsers className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Mutasi Penduduk</h1>
            <p className="mt-0.5 max-w-2xl text-sm text-slate-500">
              Riwayat penduduk yang meninggal. Penduduk di sini tidak dihitung dalam jumlah
              penduduk, tetapi datanya tetap tersimpan. Penandaan dilakukan otomatis saat
              Surat Keterangan Kematian disimpan.
            </p>
          </div>
        </div>
      </div>

      {adaGalat ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-medium">Riwayat mutasi belum bisa dimuat.</p>
          <p className="mt-0.5">
            Pastikan migrasi <code className="font-mono">0032_status_penduduk_dan_mutasi.sql</code>{" "}
            sudah dijalankan di Supabase (SQL Editor), lalu muat ulang halaman ini.
          </p>
        </div>
      ) : (
        <>
          {/* Ringkasan per jenis (yang masih berlaku) */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {JENIS.map((j) => (
              <Link
                key={j}
                href={buatUrl({ tahun, jenis: jenis === j ? "semua" : j })}
                className={`rounded-xl border bg-white p-4 transition hover:border-navy/40 ${
                  jenis === j ? "border-navy" : "border-slate-200"
                }`}
              >
                <p className="text-xs font-medium text-slate-400">
                  {LABEL_MUTASI[j]} {tahun === "semua" ? "(seluruhnya)" : `(${tahun})`}
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-800">
                  {jumlah[j].toLocaleString("id-ID")}
                </p>
                {j !== "meninggal" && (
                  <p className="mt-1 text-[11px] text-slate-400">Pencatatan menyusul di tahap berikutnya</p>
                )}
              </Link>
            ))}
          </div>

          {/* Filter tahun */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400">Tahun:</span>
            {[tahunIni, String(Number(tahunIni) - 1), "semua"].map((t) => (
              <Link
                key={t}
                href={buatUrl({ tahun: t, jenis })}
                className={`rounded-lg border px-3 py-1.5 font-medium ${
                  tahun === t
                    ? "border-navy bg-navy/5 text-navy"
                    : "border-slate-300 text-slate-500 hover:bg-slate-50"
                }`}
              >
                {t === "semua" ? "Semua" : t}
              </Link>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-auto">
              <table className="w-full min-w-[820px] border-separate border-spacing-0 text-[12px] leading-snug">
                <thead>
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {["Tanggal", "Nama", "NIK", "Wilayah", "Jenis", "Keterangan", "Dicatat oleh", ""].map(
                      (h, i) => (
                        <th
                          key={i}
                          className="whitespace-nowrap border-b border-slate-200 bg-slate-100 px-3 py-2.5"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="text-slate-600">
                  {daftar.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-10 text-center text-sm text-slate-400">
                        Belum ada catatan mutasi untuk filter ini.
                      </td>
                    </tr>
                  )}
                  {daftar.map((m) => {
                    const batal = !!m.dibatalkan_pada;
                    const w = m.warga;
                    return (
                      <tr
                        key={m.id}
                        className={`odd:bg-white even:bg-slate-50/60 ${batal ? "opacity-60" : ""}`}
                      >
                        <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2 tabular-nums">
                          {formatTanggal(m.tanggal)}
                        </td>
                        <td
                          className={`max-w-[220px] truncate border-b border-slate-100 px-3 py-2 font-medium text-slate-800 ${
                            batal ? "line-through" : ""
                          }`}
                        >
                          {w?.nama_lengkap ?? "-"}
                        </td>
                        <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2 font-mono text-[11.5px]">
                          {w?.nik ?? "-"}
                        </td>
                        <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2">
                          {w?.dusun ? `Dusun ${w.dusun}` : "-"}
                          {w?.rt || w?.rw ? ` · RT ${w.rt || "-"}/RW ${w.rw || "-"}` : ""}
                        </td>
                        <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2">
                          <span
                            className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold ${
                              WARNA_JENIS[m.jenis] || "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {LABEL_MUTASI[m.jenis] || m.jenis}
                          </span>
                          {batal && (
                            <span className="ml-1 inline-block rounded bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">
                              Dibatalkan
                            </span>
                          )}
                        </td>
                        <td className="max-w-[260px] border-b border-slate-100 px-3 py-2">
                          <span className="block truncate" title={m.keterangan || ""}>
                            {m.keterangan || "-"}
                          </span>
                          {batal && m.alasan_batal && (
                            <span className="block text-[11px] text-red-500">Alasan batal: {m.alasan_batal}</span>
                          )}
                          {m.surat_terbit_id && (
                            <Link
                              href={`/dashboard/surat-terbit/${m.surat_terbit_id}`}
                              className="text-[11px] font-medium text-navy hover:underline"
                            >
                              Lihat surat
                            </Link>
                          )}
                        </td>
                        <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2">
                          {m.dicatat_oleh_nama || "-"}
                        </td>
                        <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2 text-right">
                          {bisaBatalkan && !batal && (m.jenis === "meninggal" || m.jenis === "pindah_keluar") && (
                            <TombolBatalkanMutasi id={m.id} nama={w?.nama_lengkap ?? "penduduk ini"} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {daftar.length >= BATAS_TAMPIL && (
            <p className="text-xs text-slate-400">
              Menampilkan {BATAS_TAMPIL} catatan terbaru. Persempit dengan filter tahun atau jenis.
            </p>
          )}
        </>
      )}
    </div>
  );
}
