import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IconUsers, IconMapPin } from "@/components/icons";
import { ringkasKeluarga, formatUsia } from "@/lib/ringkasanKeluarga";

export const metadata = { title: "Detail Keluarga" };

function formatTanggal(t) {
  if (!t) return "-";
  const d = new Date(t);
  if (isNaN(d)) return "-";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function KartuAngka({ label, nilai, catatan }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-navy">{nilai}</p>
      {catatan && <p className="mt-0.5 text-xs text-slate-500">{catatan}</p>}
    </div>
  );
}

function DaftarKelompok({ judul, data }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-700">{judul}</h3>
      <ul className="mt-2 space-y-1.5">
        {data.map((d) => (
          <li key={d.nama} className="flex items-center justify-between gap-3 text-sm">
            <span className={d.nama === "Belum diisi" ? "text-slate-300" : "text-slate-600"}>
              {d.nama}
            </span>
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium tabular-nums text-slate-600">
              {d.jumlah} orang
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function DetailKeluargaPage({ params, searchParams }) {
  const { no_kk } = await params;
  const sp = await searchParams;
  const wargaDicari = sp?.warga || null; // id warga yang tadi dicari -> disorot

  if (!/^\d{16}$/.test(no_kk)) notFound();

  const supabase = await createClient();

  const [{ data: keluarga }, { data: anggotaMentah, error }] = await Promise.all([
    supabase
      .from("keluarga")
      .select("no_kk, alamat, dusun, rt, rw")
      .eq("no_kk", no_kk)
      .maybeSingle(),
    supabase
      .from("warga")
      .select(
        "id, nik, nama_lengkap, jenis_kelamin, tempat_lahir, tanggal_lahir, status_kawin, status_dalam_kk, pekerjaan, pendidikan, agama, no_hp, alamat, dusun, rt, rw"
      )
      .eq("no_kk", no_kk)
      .order("nama_lengkap"),
  ]);

  // Kolom `pendidikan` baru ada setelah migrasi 0026 dijalankan.
  if (error) {
    return (
      <div className="max-w-2xl space-y-4">
        <Link href="/dashboard/kependudukan/kartu-keluarga" className="text-sm text-slate-400 hover:text-slate-600">
          &larr; Kembali ke Kartu Keluarga
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-medium">Data keluarga belum bisa dimuat.</p>
          <p className="mt-0.5">
            Pastikan migrasi <code className="font-mono">0026_pendidikan_warga.sql</code> sudah
            dijalankan di Supabase (SQL Editor), lalu muat ulang halaman ini.
          </p>
        </div>
      </div>
    );
  }

  // Kosong bisa berarti: No. KK tidak ada, atau semua anggotanya di luar
  // wilayah akun ini (Kadus/Ketua RT dibatasi RLS). Keduanya: tampil "tidak ditemukan".
  if (!anggotaMentah || anggotaMentah.length === 0) notFound();

  const r = ringkasKeluarga(anggotaMentah);
  const alamat = keluarga?.alamat || anggotaMentah.find((a) => a.alamat)?.alamat || null;
  const dusun = keluarga?.dusun || anggotaMentah.find((a) => a.dusun)?.dusun || null;
  const rt = keluarga?.rt || anggotaMentah.find((a) => a.rt)?.rt || null;
  const rw = keluarga?.rw || anggotaMentah.find((a) => a.rw)?.rw || null;

  return (
    <div className="space-y-5">
      <div>
        <Link href="/dashboard/kependudukan/kartu-keluarga" className="text-sm text-slate-400 hover:text-slate-600">
          &larr; Kembali ke Kartu Keluarga
        </Link>

        <div className="mt-2 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-start">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy/10 text-navy">
            <IconUsers className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-slate-800">
              Keluarga {r.kepala ? r.kepala.nama_lengkap : "(Kepala Keluarga belum ditentukan)"}
            </h1>
            <p className="mt-0.5 font-mono text-sm tabular-nums text-slate-500">No. KK {no_kk}</p>
            <p className="mt-1.5 flex items-start gap-1.5 text-sm text-slate-500">
              <IconMapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <span>
                {alamat || "Alamat belum diisi"}
                {(dusun || rt || rw) && (
                  <>
                    {" — "}
                    {dusun || ""}
                    {rt ? ` · RT ${rt}` : ""}
                    {rw ? ` / RW ${rw}` : ""}
                  </>
                )}
              </span>
            </p>
          </div>
        </div>
      </div>

      {r.peringatan.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">Data keluarga ini belum lengkap</p>
          <ul className="mt-1 list-inside list-disc text-amber-700">
            {r.peringatan.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Ringkasan angka */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KartuAngka
          label="Jumlah Anggota"
          nilai={r.jumlahAnggota}
          catatan={`${r.lakiLaki} laki-laki · ${r.perempuan} perempuan`}
        />
        <KartuAngka
          label="Anak"
          nilai={r.jumlahAnak}
          catatan={`${r.jumlahDiBawah18} anggota berusia di bawah 18 th`}
        />
        <KartuAngka
          label="Pendidikan Tertinggi"
          nilai={<span className="text-base leading-tight">{r.pendidikanTertinggi || "-"}</span>}
          catatan="Di antara seluruh anggota"
        />
        <KartuAngka
          label="Rentang Usia"
          nilai={
            r.usiaTermuda === null
              ? "-"
              : r.usiaTermuda === r.usiaTertua
                ? `${r.usiaTermuda} th`
                : `${r.usiaTermuda}–${r.usiaTertua} th`
          }
          catatan={r.jumlahLansia > 0 ? `${r.jumlahLansia} lansia (60+ th)` : "Tidak ada lansia"}
        />
      </div>

      <p className="text-sm text-slate-500">
        Susunan: {r.kepala ? "1 kepala keluarga" : "belum ada kepala keluarga"}
        {r.jumlahIstri > 0 && `, ${r.jumlahIstri} istri`}
        {r.jumlahAnak > 0 && `, ${r.jumlahAnak} anak`}
        {r.jumlahFamiliLain > 0 && `, ${r.jumlahFamiliLain} famili lain/lainnya`}.
      </p>

      {/* Tabel anggota */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-separate border-spacing-0 text-[12.5px] leading-snug">
            <thead>
              <tr className="bg-slate-100 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {["Nama", "Hubungan", "L/P", "Usia", "Tgl. Lahir", "Status Kawin", "Pendidikan", "Pekerjaan", "Agama", "No. HP", ""].map(
                  (h, i) => (
                    <th key={i} className="whitespace-nowrap border-b border-slate-200 px-3 py-2.5">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="text-slate-600">
              {r.anggota.map((a) => {
                const disorot = wargaDicari === a.id;
                const sel = "whitespace-nowrap border-b border-slate-100 px-3 py-2";
                const kosong = <span className="text-slate-300">-</span>;
                return (
                  <tr key={a.id} className={disorot ? "bg-gold/15" : "odd:bg-white even:bg-slate-50/60"}>
                    <td className={`${sel} font-medium text-slate-800`}>
                      {a.nama_lengkap}
                      <span className="block font-mono text-[11px] font-normal tabular-nums text-slate-400">
                        {a.nik}
                      </span>
                    </td>
                    <td className={sel}>
                      {a.status_dalam_kk ? (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                            a.status_dalam_kk === "Kepala Keluarga"
                              ? "bg-gold/20 text-navy"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {a.status_dalam_kk}
                        </span>
                      ) : (
                        kosong
                      )}
                    </td>
                    <td className={sel}>{a.jenis_kelamin || kosong}</td>
                    <td className={`${sel} tabular-nums`}>{formatUsia(a.usia)}</td>
                    <td className={`${sel} tabular-nums`}>{formatTanggal(a.tanggal_lahir)}</td>
                    <td className={sel}>{a.status_kawin || kosong}</td>
                    <td className={sel}>{a.pendidikan || kosong}</td>
                    <td className={sel}>{a.pekerjaan || kosong}</td>
                    <td className={sel}>{a.agama || kosong}</td>
                    <td className={`${sel} tabular-nums`}>{a.no_hp || kosong}</td>
                    <td className={`${sel} text-right`}>
                      <Link
                        href={`/dashboard/kependudukan/${a.id}/edit`}
                        className="text-[12px] font-medium text-navy hover:underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rincian per kategori */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <DaftarKelompok judul="Pendidikan" data={r.perPendidikan} />
        <DaftarKelompok judul="Pekerjaan" data={r.perPekerjaan} />
        <DaftarKelompok judul="Status Kawin" data={r.perStatusKawin} />
        <DaftarKelompok judul="Agama" data={r.perAgama} />
      </div>
    </div>
  );
}
