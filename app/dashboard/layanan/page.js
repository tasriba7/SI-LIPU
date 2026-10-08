import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABELS, STATUS_BADGE_CLASS } from "@/lib/statusSurat";
import { linkWhatsApp } from "@/lib/whatsapp";

const FILTER = ["semua", "diajukan", "diproses", "selesai", "ditolak"];
const BATAS = 200;

function lamaTunggu(iso) {
  const jam = Math.floor((Date.now() - new Date(iso).getTime()) / 36e5);
  if (jam < 1) return "baru saja";
  if (jam < 24) return `${jam} jam lalu`;
  return `${Math.floor(jam / 24)} hari lalu`;
}

export default async function DaftarPengajuanLayananPage({ searchParams }) {
  const sp = await searchParams;
  const status = FILTER.includes(sp?.status) ? sp.status : "semua";
  // Buang karakter yang bisa merusak filter .or() PostgREST.
  const q = (sp?.q ?? "").trim().replace(/[,()%*]/g, " ").slice(0, 60);
  const supabase = await createClient();

  let query = supabase
    .from("pengajuan_layanan")
    .select(
      "id, kode_tracking, anonim, nama_pemohon, nik, no_hp, status, created_at, jenis_layanan_master(nama_layanan)"
    )
    .order("created_at", { ascending: false })
    .limit(BATAS);

  if (status !== "semua") query = query.eq("status", status);
  if (q) {
    query = query.or(
      `kode_tracking.ilike.%${q}%,nama_pemohon.ilike.%${q}%,nik.ilike.%${q}%`
    );
  }

  const hitung = (s) =>
    supabase
      .from("pengajuan_layanan")
      .select("id", { count: "exact", head: true })
      .eq("status", s);

  const [{ data: daftar }, ...counts] = await Promise.all([
    query,
    ...["diajukan", "diproses", "selesai", "ditolak"].map(hitung),
  ]);
  const jumlah = {
    diajukan: counts[0].count ?? 0,
    diproses: counts[1].count ?? 0,
    selesai: counts[2].count ?? 0,
    ditolak: counts[3].count ?? 0,
  };

  const hrefFilter = (f) => {
    const p = new URLSearchParams();
    if (f !== "semua") p.set("status", f);
    if (q) p.set("q", q);
    const s = p.toString();
    return s ? `/dashboard/layanan?${s}` : "/dashboard/layanan";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-slate-800">Pengajuan Layanan</h1>
        <p className="text-sm text-slate-500">
          Semua pengajuan warga, terbaru di atas. Klik kode untuk memproses.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Object.keys(jumlah).map((s) => (
          <Link
            key={s}
            href={hrefFilter(s)}
            className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-2xl font-bold text-slate-800">{jumlah[s]}</p>
            <span
              className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[s]}`}
            >
              {STATUS_LABELS[s]}
            </span>
          </Link>
        ))}
      </div>

      <form className="flex flex-wrap items-center gap-2" action="/dashboard/layanan">
        {status !== "semua" && <input type="hidden" name="status" value={status} />}
        <input
          name="q"
          defaultValue={q}
          placeholder="Cari kode, nama, atau NIK…"
          className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
        />
        <button className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light">
          Cari
        </button>
        {q && (
          <Link href={hrefFilter(status).replace(/[?&]q=[^&]*/, "")} className="text-sm text-slate-400 hover:text-slate-600">
            Reset
          </Link>
        )}
      </form>

      <div className="flex flex-wrap gap-2">
        {FILTER.map((f) => (
          <Link
            key={f}
            href={hrefFilter(f)}
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
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Kode</th>
              <th className="px-4 py-3 font-medium">Jenis Layanan</th>
              <th className="px-4 py-3 font-medium">Pemohon</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Masuk</th>
              <th className="px-4 py-3 font-medium">Hubungi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(daftar ?? []).map((row) => {
              // Pengaduan anonim: tidak ada nama/HP, jadi tidak ada tombol WhatsApp.
              const wa = row.anonim
                ? null
                : linkWhatsApp(
                    row.no_hp,
                    `Halo ${row.nama_pemohon}, ini kantor desa terkait pengajuan ${row.kode_tracking}.`
                  );
              return (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/layanan/${row.id}`}
                      className="font-mono text-navy hover:underline"
                    >
                      {row.kode_tracking}
                    </Link>
                    {row.status === "diajukan" && (
                      <span className="ml-2 rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-semibold text-navy">
                        Baru
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {row.jenis_layanan_master?.nama_layanan}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {row.anonim ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                        Anonim
                      </span>
                    ) : (
                      row.nama_pemohon
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[row.status]}`}
                    >
                      {STATUS_LABELS[row.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    <span title={new Date(row.created_at).toLocaleString("id-ID")}>
                      {lamaTunggu(row.created_at)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {wa ? (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-emerald-600 hover:underline"
                      >
                        WhatsApp
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              );
            })}
            {(daftar ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  Belum ada pengajuan
                  {status !== "semua" ? ` dengan status "${STATUS_LABELS[status]}"` : ""}
                  {q ? ` untuk "${q}"` : ""}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {(daftar ?? []).length === BATAS && (
        <p className="text-xs text-slate-400">
          Menampilkan {BATAS} terbaru. Gunakan pencarian atau filter untuk mempersempit.
        </p>
      )}
    </div>
  );
}
