import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ambilRole } from "@/lib/akses";
import { bisaUbahPilkades } from "@/lib/roles";
import {
  ambilPeriode, ambilDaftarPemilih, hitungUmur, formatTanggal, terlaluMuda, STATUS_VERIFIKASI, STATUS_BADGE_CLASS,
} from "@/lib/pilkades";
import { ambilCalonPemilih, simpanPemilih, terapkanFilterUsia } from "../actions";

export const metadata = { title: "Daftar Pemilih" };
const PER_HALAMAN = 30;

export default async function PemilihPage({ searchParams }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const periode = await ambilPeriode(supabase);
  const { role } = await ambilRole(supabase);
  const bisaUbah = bisaUbahPilkades(role);
  if (!periode) return <p className="text-sm text-slate-500">Belum ada periode Pilkades.</p>;

  const [{ data: semua, error }, { data: tps }] = await Promise.all([
    ambilDaftarPemilih(supabase, periode.id),
    supabase.from("pilkades_tps").select("id, nama").eq("periode_id", periode.id).order("nama"),
  ]);

  // Pratinjau filter usia (hanya menghitung, tidak mengubah data).
  const usiaForm = Number.isInteger(parseInt(sp.usia, 10)) ? parseInt(sp.usia, 10) : (periode.usia_minimum ?? 17);
  const kawinForm = sp.usia === undefined ? periode.termasuk_pernah_kawin !== false : sp.kawin === "1";
  let pratinjau = null;
  if (sp.usia !== undefined && usiaForm >= 0 && usiaForm <= 120) {
    const { data } = await supabase.rpc("pilkades_pratinjau_usia", {
      p_periode: periode.id, p_usia: usiaForm, p_kawin: kawinForm,
    });
    pratinjau = Array.isArray(data) ? data[0] : data;
  }

  const acuan = periode.tanggal_pemungutan ? new Date(periode.tanggal_pemungutan) : new Date();
  const dusunList = [...new Set((semua ?? []).map((r) => r.dusun).filter(Boolean))].sort();
  const cari = (sp.cari ?? "").toString().toLowerCase();
  const fDusun = sp.dusun ?? "";
  const fStatus = sp.status ?? "";
  const hasil = (semua ?? []).filter(
    (r) =>
      (!cari || r.nama_lengkap.toLowerCase().includes(cari)) &&
      (!fDusun || r.dusun === fDusun) &&
      (fStatus === "semua" ||
        (fStatus
          ? r.status_verifikasi === fStatus
          : r.status_verifikasi !== "tidak_memenuhi" && !terlaluMuda(r, periode, acuan)))
  );
  // Secara bawaan nama yang "tidak memenuhi syarat" (mis. belum cukup usia) disembunyikan.
  const jumlahDisembunyikan = fStatus
    ? 0
    : (semua ?? []).filter(
        (r) => r.status_verifikasi === "tidak_memenuhi" || terlaluMuda(r, periode, acuan)
      ).length;
  const halaman = Math.max(1, parseInt(sp.hal ?? "1", 10) || 1);
  const totalHal = Math.max(1, Math.ceil(hasil.length / PER_HALAMAN));
  const tampil = hasil.slice((halaman - 1) * PER_HALAMAN, halaman * PER_HALAMAN);

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
            {hasil.length} calon pemilih ditampilkan{jumlahDisembunyikan > 0 ? ` (${jumlahDisembunyikan} belum cukup usia / tidak memenuhi syarat disembunyikan)` : ""}. Umur dihitung pada tanggal pemungutan
            {periode.tanggal_pemungutan ? "" : " (belum diisi, memakai hari ini)"}. Penentuan
            &ldquo;memenuhi syarat&rdquo; mengikuti aturan Pilkades daerah, dilakukan manual oleh panitia.
          </p>
        </div>
        {bisaUbah && (
        <form action={ambilCalonPemilih}>
          <input type="hidden" name="periode_id" value={periode.id} />
          <button className="rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white hover:bg-navy-light">
            Ambil calon pemilih dari data warga
          </button>
        </form>
        )}
      </div>

      {sp.filter === "ok" && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Filter usia diterapkan: {sp.m} ditandai memenuhi syarat, {sp.t} tidak memenuhi syarat (kurang usia), {sp.p ?? 0} perlu dicek (data tidak wajar), {sp.b} masih belum diperiksa.
        </p>
      )}
      {sp.filter === "gagal" && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          Filter usia gagal diterapkan. Pastikan migrasi 0056 sudah dijalankan dan Anda login sebagai panitia.
        </p>
      )}

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Saring otomatis berdasarkan usia</h2>
          <p className="text-xs text-slate-500">
            Usia dihitung pada tanggal pemungutan{periode.tanggal_pemungutan ? ` (${formatTanggal(periode.tanggal_pemungutan)})` : " (belum diisi, memakai hari ini)"}.
            {!bisaUbah && ` Aturan saat ini: minimal ${periode.usia_minimum ?? 17} tahun${periode.termasuk_pernah_kawin === false ? "" : " atau sudah/pernah kawin"}.`}
          </p>
        </div>
        <form className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-slate-500">
            Usia minimal (tahun)
            <input type="number" name="usia" min="0" max="120" defaultValue={usiaForm} className={`${input} mt-1 block w-24`} />
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm text-slate-600">
            <input type="checkbox" name="kawin" value="1" defaultChecked={kawinForm} />
            Atau sudah/pernah kawin
          </label>
          <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">Lihat jumlah</button>
        </form>

        {pratinjau && (
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-5">
              {[
                ["Total calon", pratinjau.total, "text-slate-800"],
                ["Cukup usia", pratinjau.layak, "text-emerald-700"],
                ["Belum cukup usia", pratinjau.di_bawah_usia, "text-red-600"],
                ["Perlu dicek (data tidak wajar)", pratinjau.perlu_dicek, "text-amber-600"],
                ["Dikunci manual", pratinjau.dikunci_manual, "text-slate-500"],
              ].map(([label, n, warna]) => (
                <div key={label} className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className={`text-xl font-bold ${warna}`}>{n}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400">
              &ldquo;Dikunci manual&rdquo; = sudah Anda tetapkan sendiri, tidak akan diubah. Tanggal acuan: {formatTanggal(pratinjau.tanggal_acuan)}.
            </p>
            {bisaUbah && (
              <form action={terapkanFilterUsia} className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <input type="hidden" name="periode_id" value={periode.id} />
                <input type="hidden" name="usia" value={usiaForm} />
                <input type="hidden" name="kawin" value={kawinForm ? "1" : "0"} />
                <p className="text-sm text-amber-800">
                  {pratinjau.di_bawah_usia} orang akan ditandai &ldquo;Tidak memenuhi syarat&rdquo; (catatan otomatis). Bisa diubah lagi per orang.
                </p>
                <label className="flex items-center gap-2 text-sm text-amber-800">
                  <input type="checkbox" name="tandai" value="1" />
                  Tandai juga {pratinjau.layak} yang cukup usia sebagai &ldquo;Memenuhi syarat&rdquo;
                  (centang hanya bila syarat lain, mis. domisili, sudah pasti terpenuhi)
                </label>
                <button className="rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white hover:bg-navy-light">
                  Terapkan filter usia
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">Gagal memuat daftar. Pastikan migrasi 0051 sudah dijalankan.</p>}

      <form className="flex flex-wrap gap-2">
        <input name="cari" defaultValue={sp.cari ?? ""} placeholder="Cari nama" className={input} />
        <select name="dusun" defaultValue={fDusun} className={input}>
          <option value="">Semua dusun</option>
          {dusunList.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select name="status" defaultValue={fStatus} className={input}>
          <option value="">Tanpa yang tidak memenuhi syarat</option>
          <option value="semua">Semua (termasuk tidak memenuhi)</option>
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
                <tr key={`${r.id}-${r.status_verifikasi}-${r.tps_id ?? ""}-${r.catatan ?? ""}`} className="align-top">
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
                    <select disabled={!bisaUbah} form={formId} name="status_verifikasi" defaultValue={r.status_verifikasi} className={`${input} ${STATUS_BADGE_CLASS[r.status_verifikasi]}`}>
                      {Object.entries(STATUS_VERIFIKASI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select disabled={!bisaUbah} form={formId} name="tps_id" defaultValue={r.tps_id ?? ""} className={input}>
                      <option value="">-</option>
                      {(tps ?? []).map((t) => <option key={t.id} value={t.id}>{t.nama}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input readOnly={!bisaUbah} form={formId} name="catatan" defaultValue={r.catatan ?? ""} maxLength={300} className={`${input} w-40`} />
                  </td>
                  <td className="px-3 py-2">
                    {bisaUbah && (
                      <form id={formId} action={simpanPemilih}>
                        <input type="hidden" name="id" value={r.id} />
                        <button className="rounded-lg bg-navy px-3 py-1.5 text-xs font-medium text-white hover:bg-navy-light">Simpan</button>
                      </form>
                    )}
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
