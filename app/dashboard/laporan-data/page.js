import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { pastikanAdmin } from "@/lib/akses";
import HalamanTerbatas from "@/components/dashboard/HalamanTerbatas";
import { linkWhatsApp } from "@/lib/whatsapp";
import {
  STATUS_LAPORAN,
  STATUS_LAPORAN_LABEL,
  STATUS_LAPORAN_BADGE,
} from "@/lib/laporanData";
import FormTanggapi from "./FormTanggapi";

export const metadata = { title: "Laporan Data Warga" };

const BATAS = 100;
const FILTER = ["semua", ...STATUS_LAPORAN];

export default async function LaporanDataPage({ searchParams }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const akses = await pastikanAdmin(supabase);
  if (akses.error) return <HalamanTerbatas />;

  const status = FILTER.includes(sp?.status) ? sp.status : "semua";

  let query = supabase
    .from("laporan_data_warga")
    .select(
      "id, kode, bagian_data, pesan, no_hp_kontak, status, catatan_admin, created_at, warga_id, warga(nama_lengkap, nik, dusun, rt, rw, no_hp)"
    )
    .order("created_at", { ascending: false })
    .limit(BATAS);
  if (status !== "semua") query = query.eq("status", status);

  const hitung = (s) =>
    supabase
      .from("laporan_data_warga")
      .select("id", { count: "exact", head: true })
      .eq("status", s);

  const [{ data: daftar, error }, ...counts] = await Promise.all([
    query,
    ...STATUS_LAPORAN.map(hitung),
  ]);
  const jumlah = Object.fromEntries(STATUS_LAPORAN.map((s, i) => [s, counts[i].count ?? 0]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-slate-800">Laporan Data Warga</h1>
        <p className="text-sm text-slate-500">
          Pesan dari warga yang menemukan data kependudukannya keliru atau kurang. Perbaiki datanya di
          menu Data Kependudukan, lalu ubah status laporan di sini.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTER.map((f) => (
          <Link
            key={f}
            href={f === "semua" ? "/dashboard/laporan-data" : `/dashboard/laporan-data?status=${f}`}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              status === f ? "bg-navy text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {f === "semua" ? "Semua" : STATUS_LAPORAN_LABEL[f]}
            {f !== "semua" && ` (${jumlah[f]})`}
          </Link>
        ))}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          Laporan belum bisa dimuat. Pastikan migrasi 0038 sudah dijalankan.
        </p>
      )}

      {!error && (daftar ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-14 text-center">
          <p className="text-sm text-slate-400">Belum ada laporan.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(daftar ?? []).map((l) => {
            const w = l.warga;
            const hp = l.no_hp_kontak || w?.no_hp;
            const wa = linkWhatsApp(
              hp,
              `Halo ${w?.nama_lengkap ?? ""}, kami dari kantor desa menindaklanjuti laporan data Anda (${l.kode}).`
            );
            return (
              <div key={l.id} className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs tracking-wider text-slate-500">{l.kode}</span>
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_LAPORAN_BADGE[l.status]}`}>
                    {STATUS_LAPORAN_LABEL[l.status]}
                  </span>
                </div>

                <div>
                  <p className="font-semibold text-slate-800">{w?.nama_lengkap ?? "—"}</p>
                  <p className="text-xs text-slate-500">
                    NIK {w?.nik ?? "—"}
                    {w?.dusun ? ` · Dusun ${w.dusun}` : ""}
                    {w?.rt || w?.rw ? ` · RT ${w.rt || "-"}/RW ${w.rw || "-"}` : ""}
                  </p>
                  <p className="text-xs text-slate-400">
                    Dikirim {new Date(l.created_at).toLocaleString("id-ID")}
                  </p>
                </div>

                {l.bagian_data && (
                  <p className="text-xs">
                    <span className="text-slate-400">Bagian data: </span>
                    <span className="font-medium text-slate-700">{l.bagian_data}</span>
                  </p>
                )}
                <p className="whitespace-pre-line rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {l.pesan}
                </p>

                <div className="flex flex-wrap gap-2 text-sm">
                  {l.warga_id && (
                    <Link
                      href={`/dashboard/kependudukan/${l.warga_id}/edit`}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600 hover:border-navy hover:text-navy"
                    >
                      Buka data warga
                    </Link>
                  )}
                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600 hover:border-emerald-600 hover:text-emerald-700"
                    >
                      Hubungi via WhatsApp
                    </a>
                  )}
                </div>

                <FormTanggapi id={l.id} status={l.status} catatan={l.catatan_admin} />
              </div>
            );
          })}
        </div>
      )}
      {(daftar ?? []).length >= BATAS && (
        <p className="text-xs text-slate-400">Menampilkan {BATAS} laporan terbaru.</p>
      )}
    </div>
  );
}
