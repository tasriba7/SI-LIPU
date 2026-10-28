import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABELS, STATUS_BADGE_CLASS } from "@/lib/statusSurat";
import { STATUS_PANTAU as STATUS_SEMUA, lamaTunggu, lamaPenanganan, formatWaktu } from "@/lib/pantauLayanan";

const BATAS = 200;

/**
 * Daftar pengajuan layanan MODE LIHAT untuk Anggota BPD. Tidak ada tombol
 * proses/ubah/hapus, tidak ada NIK, No. HP, maupun tombol WhatsApp.
 *
 * @param {object}  sp         searchParams (status, q)
 * @param {string}  basePath   path halaman ini (untuk tautan filter)
 * @param {string}  judul
 * @param {string}  deskripsi
 * @param {string=} kategori   mis. "pengaduan" -> hanya kategori itu
 * @param {string=} sumber     nama view (bawaan: pengajuan_layanan_pantau untuk BPD)
 * @param {string=} detailBase awal alamat halaman detail (bawaan: /dashboard/layanan)
 * @param {*=}      catatan    pesan tambahan di bawah deskripsi
 * @param {string=} labelLihat bila diisi (mis. "Lihat isi aduan"), kode tracking jadi teks biasa dan
 *                             tautan ke detail memakai label ini (kolom "Aksi")
 * @param {string[]=} statusTampil status yang ditampilkan di kartu/filter (bawaan: semua)
 * @param {{key:string,label:string,status:string[],badge:string}[]=} kelompok bila diisi, kartu/filter/label
 *                             memakai kelompok ini (mis. Diajukan | Selesai diproses), bukan status mentah
 */
export default async function PantauLayanan({
  sp, basePath, judul, deskripsi, kategori,
  sumber = "pengajuan_layanan_pantau", detailBase = "/dashboard/layanan", catatan = null,
  labelLihat = null, statusTampil = STATUS_SEMUA, kelompok = null,
}) {
  const STATUS_PANTAU = kelompok ? kelompok.map((k) => k.key) : statusTampil;
  const daftarStatus = (key) => kelompok?.find((k) => k.key === key)?.status ?? [key];
  const labelStatus = (st) =>
    kelompok ? kelompok.find((k) => k.status.includes(st))?.label ?? STATUS_LABELS[st] : STATUS_LABELS[st];
  const badgeStatus = (st) =>
    kelompok ? kelompok.find((k) => k.status.includes(st))?.badge ?? STATUS_BADGE_CLASS[st] : STATUS_BADGE_CLASS[st];
  const supabase = await createClient();
  const status = STATUS_PANTAU.includes(sp?.status) ? sp.status : "semua";
  // Buang karakter yang bisa merusak filter PostgREST.
  const q = (sp?.q ?? "").trim().replace(/[,()%*]/g, " ").slice(0, 40);

  const dasar = () => supabase.from(sumber);

  let query = dasar()
    .select(
      "id, kode_tracking, status, anonim, pemohon_samar, nama_layanan, jenis_pengaduan, created_at, updated_at, diproses_oleh_nama"
    )
    .order("created_at", { ascending: false })
    .limit(BATAS);
  if (kategori) query = query.eq("kategori", kategori);
  if (status !== "semua") query = query.in("status", daftarStatus(status));
  if (q) query = query.ilike("kode_tracking", `%${q}%`);

  const hitung = (s) => {
    let c = dasar().select("id", { count: "exact", head: true }).in("status", daftarStatus(s));
    if (kategori) c = c.eq("kategori", kategori);
    return c;
  };

  const [{ data: daftar }, ...counts] = await Promise.all([query, ...STATUS_PANTAU.map(hitung)]);
  const jumlah = Object.fromEntries(STATUS_PANTAU.map((s, i) => [s, counts[i].count ?? 0]));
  const total = Object.values(jumlah).reduce((a, b) => a + b, 0);
  const selesaiTolak = kelompok
    ? jumlah[STATUS_PANTAU[STATUS_PANTAU.length - 1]] ?? 0
    : (jumlah.selesai ?? 0) + (jumlah.ditolak ?? 0);
  const persenTuntas = total ? Math.round((selesaiTolak / total) * 100) : 0;

  const href = (f) => {
    const p = new URLSearchParams();
    if (f !== "semua") p.set("status", f);
    if (q) p.set("q", q);
    const s = p.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-slate-800">{judul}</h1>
        <p className="text-sm text-slate-500">{deskripsi}</p>
        <p className="mt-2 inline-block rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">
          Mode lihat — data pribadi pemohon (NIK, No. HP) tidak ditampilkan
        </p>
        {catatan}
      </div>

      <div className={`grid grid-cols-2 gap-3 ${STATUS_PANTAU.length <= 2 ? "sm:grid-cols-3" : STATUS_PANTAU.length === 3 ? "sm:grid-cols-4" : "sm:grid-cols-5"}`}>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-2xl font-bold text-slate-800">{total}</p>
          <p className="mt-1 text-xs text-slate-500">Total masuk</p>
          <p className="mt-1 text-[11px] text-emerald-600">{persenTuntas}% {kelompok ? "sudah dibalas" : "sudah tuntas"}</p>
        </div>
        {STATUS_PANTAU.map((s) => (
          <Link
            key={s}
            href={href(s)}
            className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-2xl font-bold text-slate-800">{jumlah[s]}</p>
            <span
              className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium ${badgeStatus(daftarStatus(s)[0])}`}
            >
              {kelompok ? kelompok.find((k) => k.key === s).label : STATUS_LABELS[s]}
            </span>
          </Link>
        ))}
      </div>

      <form className="flex flex-wrap items-center gap-2" action={basePath}>
        {status !== "semua" && <input type="hidden" name="status" value={status} />}
        <input
          name="q"
          defaultValue={q}
          placeholder="Cari kode tracking…"
          className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
        />
        <button className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light">
          Cari
        </button>
        {q && (
          <Link
            href={status === "semua" ? basePath : `${basePath}?status=${status}`}
            className="text-sm text-slate-400 hover:text-slate-600"
          >
            Reset
          </Link>
        )}
      </form>

      <div className="flex flex-wrap gap-2">
        {["semua", ...STATUS_PANTAU].map((f) => (
          <Link
            key={f}
            href={href(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              status === f
                ? "bg-navy text-white"
                : "border border-slate-200 bg-white text-slate-500 hover:border-navy-light/40"
            }`}
          >
            {f === "semua" ? "Semua" : kelompok ? kelompok.find((k) => k.key === f).label : STATUS_LABELS[f]}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Kode</th>
              <th className="px-4 py-3 font-medium">Jenis Layanan</th>
              <th className="px-4 py-3 font-medium">Pemohon</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Masuk</th>
              <th className="px-4 py-3 font-medium">Lama penanganan</th>
              <th className="px-4 py-3 font-medium">Ditangani oleh</th>
              {labelLihat && <th className="px-4 py-3 font-medium">Aksi</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(daftar ?? []).map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  {labelLihat ? (
                    <span className="font-mono text-slate-700">{r.kode_tracking}</span>
                  ) : (
                    <Link
                      href={`${detailBase}/${r.id}`}
                      className="font-mono text-navy hover:underline"
                    >
                      {r.kode_tracking}
                    </Link>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {r.nama_layanan}
                  {r.jenis_pengaduan && (
                    <span className="block text-xs text-slate-400">{r.jenis_pengaduan}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {r.anonim ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                      Anonim
                    </span>
                  ) : (
                    r.pemohon_samar || "-"
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${badgeStatus(r.status)}`}
                  >
                    {labelStatus(r.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400">
                  <span title={formatWaktu(r.created_at)}>{lamaTunggu(r.created_at)}</span>
                </td>
                <td className="px-4 py-3 text-slate-600">{lamaPenanganan(r)}</td>
                <td className="px-4 py-3 text-slate-500">{r.diproses_oleh_nama || "-"}</td>
                {labelLihat && (
                  <td className="px-4 py-3">
                    <Link
                      href={`${detailBase}/${r.id}`}
                      className="whitespace-nowrap rounded-lg border border-navy/30 px-3 py-1.5 text-xs font-medium text-navy transition hover:bg-navy hover:text-white"
                    >
                      {labelLihat}
                    </Link>
                  </td>
                )}
              </tr>
            ))}
            {(daftar ?? []).length === 0 && (
              <tr>
                <td colSpan={labelLihat ? 8 : 7} className="px-4 py-10 text-center text-slate-400">
                  Belum ada data
                  {status !== "semua" ? ` dengan status "${kelompok ? kelompok.find((k) => k.key === status).label : STATUS_LABELS[status]}"` : ""}
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
