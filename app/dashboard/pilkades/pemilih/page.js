import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  ambilPeriode, hitungUmur, STATUS_VERIFIKASI, STATUS_BADGE_CLASS,
} from "@/lib/pilkades";
import { ambilCalonPemilih, simpanPemilih } from "../actions";

export const metadata = { title: "Daftar Pemilih" };
const PER_HALAMAN = 30;

export default async function PemilihPage({ searchParams }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const periode = await ambilPeriode(supabase);
  if (!periode) return <p className="text-sm text-slate-500">Belum ada periode Pilkades.</p>;

  const [{ data: semua, error }, { data: tps }] = await Promise.all([
    supabase.rpc("pilkades_daftar_pemilih", { p_periode: periode.id }),
    supabase.from("pilkades_tps").select("id, nama").eq("periode_id", periode.id).order("nama"),
  ]);

  const dusunList = [...new Set((semua ?? []).map((r) => r.dusun).filter(Boolean))].sort();
  const cari = (sp.cari ?? "").toString().toLowerCase();
  const fDusun = sp.dusun ?? "";
  const fStatus = sp.status ?? "";
  const hasil = (semua ?? []).filter(
    (r) =>
      (!cari || r.nama_lengkap.toLowerCase().includes(cari)) &&
      (!fDusun || r.dusun === fDusun) &&
      (!fStatus || r.status_verifikasi === fStatus)
  );
  const halaman = Math.max(1, parseInt(sp.hal ?? "1", 10) || 1);
  const totalHal = Math.max(1, Math.ceil(hasil.length / PER_HALAMAN));
  const tampil = hasil.slice((halaman - 1) * PER_HALAMAN, halaman * PER_HALAMAN);
  const acuan = periode.tanggal_pemungutan ? new Date(periode.tanggal_pemungutan) : new Date();

  const qs = (o) => {
    const p = new URLSearchParams({ cari: sp.cari ?? "", dusun: fDusun, status: fStatus, ...o });
    for (const [k, v] of [...p]) if (!v) p.delete(k);
    return `?${p.toString()}`;
  };
  const input = "rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-navy";

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Daftar Pemilih &mdash; {periode.nama}</h1>
          <p className="text-sm text-slate-500">
            {semua?.length ?? 0} calon pemilih. Umur dihitung pada tanggal pemungutan
            {periode.tanggal_pemungutan ? "" : " (belum diisi, memakai hari ini)"}. Penentuan
            &ldquo;memenuhi syarat&rdquo; mengikuti aturan Pilkades daerah, dilakukan manual oleh panitia.
          </p>
        </div>
        <form action={ambilCalonPemilih}>
          <input type="hidden" name="periode_id" value={periode.id} />
          <button className="rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white hover:bg-navy-light">
            Ambil calon pemilih dari data warga
          </button>
        </form>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">Gagal memuat daftar. Pastikan migrasi 0051 sudah dijalankan.</p>}

      <form className="flex flex-wrap gap-2">
        <input name="cari" defaultValue={sp.cari ?? ""} placeholder="Cari nama" className={input} />
        <select name="dusun" defaultValue={fDusun} className={input}>
          <option value="">Semua dusun</option>
          {dusunList.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select name="status" defaultValue={fStatus} className={input}>
          <option value="">Semua status</option>
          {Object.entries(STATUS_VERIFIKASI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">Terapkan</button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2">Nama</th>
              <th className="px-3 py-2">Umur</th>
              <th className="px-3 py-2">Dusun / RT-RW</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">TPS</th>
              <th className="px-3 py-2">Catatan</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tampil.map((r) => {
              const formId = `f-${r.id}`;
              return (
                <tr key={r.id} className="align-top">
                  <td className="px-3 py-2">
                    <p className="font-medium text-slate-800">{r.nama_lengkap}</p>
                    <p className="text-xs text-slate-400">{r.nik_samar} · {r.jenis_kelamin ?? "-"}</p>
                  </td>
                  <td className="px-3 py-2">{hitungUmur(r.tanggal_lahir, acuan) ?? "-"}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">
                    {r.dusun ?? "-"}
                    <br />
                    {r.rt || r.rw ? `RT ${r.rt ?? "-"} / RW ${r.rw ?? "-"}` : <span className="text-amber-600">RT/RW kosong</span>}
                  </td>
                  <td className="px-3 py-2">
                    <select form={formId} name="status_verifikasi" defaultValue={r.status_verifikasi} className={`${input} ${STATUS_BADGE_CLASS[r.status_verifikasi]}`}>
                      {Object.entries(STATUS_VERIFIKASI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select form={formId} name="tps_id" defaultValue={r.tps_id ?? ""} className={input}>
                      <option value="">-</option>
                      {(tps ?? []).map((t) => <option key={t.id} value={t.id}>{t.nama}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input form={formId} name="catatan" defaultValue={r.catatan ?? ""} maxLength={300} className={`${input} w-40`} />
                  </td>
                  <td className="px-3 py-2">
                    <form id={formId} action={simpanPemilih}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className="rounded-lg bg-navy px-3 py-1.5 text-xs font-medium text-white hover:bg-navy-light">Simpan</button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {!tampil.length && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-400">Tidak ada data.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>Halaman {halaman} dari {totalHal} · {hasil.length} data</span>
        <span className="flex gap-3">
          {halaman > 1 && <Link href={qs({ hal: halaman - 1 })} className="text-navy underline">Sebelumnya</Link>}
          {halaman < totalHal && <Link href={qs({ hal: halaman + 1 })} className="text-navy underline">Berikutnya</Link>}
        </span>
      </div>
    </div>
  );
}
