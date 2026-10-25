import TahapTerkunci from "@/components/pilkades/TahapTerkunci";
import { kunciHalaman } from "@/lib/pilkadesKunci";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ambilRole } from "@/lib/akses";
import { bisaUbahPilkades } from "@/lib/roles";
import { ambilPeriode, ambilDptTerbaru, ambilHadir, formatTanggal } from "@/lib/pilkades";
import { catatHadir, batalHadir } from "@/app/dashboard/pilkades/actions";
import TombolKonfirmasi from "@/components/pilkades/TombolKonfirmasi";
import { JudulHalaman, Catatan, Kartu, KosongPandu, tombol, kolomKecil } from "@/components/pilkades/UI";
import PesanSekali from "@/components/pilkades/PesanSekali";
import { pesanDari, teknis } from "@/lib/pilkadesPesan";

export const metadata = { title: "Daftar Hadir — Pilkades" };
const PER_HALAMAN = 30;

const jam = (t) =>
  new Date(t).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Makassar" });

const PESAN_HASIL = {
  ok: (sp) => ["sukses", "Hadir tercatat", sp.nama ? `${sp.nama} sudah dicatat hadir.` : "Kehadiran dicatat."],
  batal: ["sukses", "Catatan hadir dibatalkan", "Pembatalan tercatat di Riwayat Aktivitas beserta alasannya."],
  gagal: (sp) => ["bahaya", "Tidak berhasil", sp.pesan || "Silakan coba lagi."],
};

export default async function HadirPage({ searchParams }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const periode = await ambilPeriode(supabase);
  const { role } = await ambilRole(supabase);
  const bisaUbah = bisaUbahPilkades(role);
  if (!periode) {
    return <KosongPandu judul="Belum ada periode Pilkades" href="/dashboard/pilkades/pengaturan/periode" label="Buka Periode Pilkades" />;
  }

  // Gerbang urutan kerja: tahap ini terkunci sampai pekerjaan sebelumnya selesai.
  const kunci = await kunciHalaman(supabase, periode, "/dashboard/pilkades/hari-h/hadir");
  if (kunci) return <TahapTerkunci kunci={kunci} />;

  const dpt = await ambilDptTerbaru(supabase, periode.id);
  if (!dpt.head) {
    return (
      <div className="mx-auto max-w-5xl">
        <KosongPandu
          judul="DPT belum ditetapkan"
          teks="Daftar hadir mengacu ke DPT resmi, bukan ke data yang masih bisa berubah. Tetapkan DPS dan DPT dulu."
          href="/dashboard/pilkades/daftar"
          label="Ke Langkah 5: Tetapkan DPS & DPT"
        />
      </div>
    );
  }

  const { data: hadirList, error: errHadir } = await ambilHadir(supabase, periode.id);
  const hadirMap = new Map((hadirList ?? []).map((h) => [h.warga_id, h]));
  const isi = dpt.isi;

  // Rekap per TPS (berdasarkan isi DPT; hadir dihitung dari pemilih yang memang ada di DPT ini).
  const rekap = new Map();
  for (const r of isi) {
    const k = r.tps_nama ?? "Tanpa TPS";
    const e = rekap.get(k) ?? { tps: k, dpt: 0, hadir: 0 };
    e.dpt += 1;
    if (hadirMap.has(r.warga_id)) e.hadir += 1;
    rekap.set(k, e);
  }
  const rekapList = [...rekap.values()].sort((a, b) => a.tps.localeCompare(b.tps, "id"));
  const totalDpt = isi.length;
  const totalHadir = rekapList.reduce((n, e) => n + e.hadir, 0);
  const persen = totalDpt ? Math.round((totalHadir / totalDpt) * 1000) / 10 : 0;

  // Saringan & halaman.
  const cari = (sp.cari ?? "").toString().trim().toLowerCase();
  const fTps = sp.tps ?? "";
  const tampilPilihan = ["belum", "sudah", "semua"].includes(sp.tampil) ? sp.tampil : "belum";
  const hasil = isi.filter((r) => {
    const sudah = hadirMap.has(r.warga_id);
    return (
      (!cari || r.nama_lengkap.toLowerCase().includes(cari)) &&
      (!fTps || (r.tps_nama ?? "Tanpa TPS") === fTps) &&
      (tampilPilihan === "semua" || (tampilPilihan === "sudah" ? sudah : !sudah))
    );
  });
  const halaman = Math.max(1, parseInt(sp.hal ?? "1", 10) || 1);
  const totalHal = Math.max(1, Math.ceil(hasil.length / PER_HALAMAN));
  const tampil = hasil.slice((halaman - 1) * PER_HALAMAN, halaman * PER_HALAMAN);
  const qs = (o) => {
    const p = new URLSearchParams({ cari: sp.cari ?? "", tps: fTps, tampil: tampilPilihan, ...o });
    for (const [k, v] of [...p]) if (!v) p.delete(k);
    return `?${p.toString()}`;
  };

  // Field tersembunyi agar setelah mencatat, halaman kembali ke saringan yang sama.
  const Penjaga = () => (
    <>
      <input type="hidden" name="cari" value={sp.cari ?? ""} />
      <input type="hidden" name="tps" value={fTps} />
      <input type="hidden" name="tampil" value={tampilPilihan} />
      <input type="hidden" name="hal" value={halaman} />
    </>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <JudulHalaman
        judul={`Daftar Hadir — ${periode.nama}`}
        penjelasan={`Dipakai pada hari pemungutan suara (${formatTanggal(periode.tanggal_pemungutan)}). Cari nama pemilih, lalu klik “Catat hadir”. Acuannya DPT versi ${dpt.head.versi} (ditetapkan ${formatTanggal(dpt.head.tanggal_penetapan)}). Satu pemilih hanya bisa dicatat sekali.`}
      />

      <PesanSekali pesan={pesanDari(PESAN_HASIL, sp)} />
      <Catatan
        butir={[
          (dpt.error || errHadir) && { jenis: "bahaya", judul: "Data gagal dimuat", isi: `Muat ulang halaman ini.${teknis(role, "0054", "0055")}` },
        ]}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Pemilih di DPT", totalDpt, "border-sky-200 bg-sky-50 text-sky-800"],
          ["Sudah hadir", totalHadir, "border-emerald-200 bg-emerald-50 text-emerald-800"],
          ["Belum hadir", totalDpt - totalHadir, "border-amber-200 bg-amber-50 text-amber-800"],
          ["Tingkat kehadiran", `${persen}%`, "border-slate-200 bg-slate-50 text-slate-800"],
        ].map(([label, n, gaya]) => (
          <div key={label} className={`rounded-xl border p-4 ${gaya}`}>
            <p className="text-sm font-semibold text-slate-800">{label}</p>
            <p className="mt-1 text-2xl font-extrabold">{n}</p>
          </div>
        ))}
      </div>

      <Kartu>
        <h2 className="text-base font-bold text-sky-950">Rekap per TPS</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-sm font-bold text-sky-900">
              <tr>
                <th className="py-2 pr-4">TPS</th>
                <th className="py-2 pr-4">Pemilih di DPT</th>
                <th className="py-2 pr-4">Hadir</th>
                <th className="py-2 pr-4">Belum hadir</th>
                <th className="py-2"><span className="sr-only">Lihat</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rekapList.map((e) => (
                <tr key={e.tps}>
                  <td className="py-2 pr-4 font-semibold text-slate-900">{e.tps}</td>
                  <td className="py-2 pr-4">{e.dpt}</td>
                  <td className="py-2 pr-4 font-semibold text-emerald-700">{e.hadir}</td>
                  <td className="py-2 pr-4 text-amber-700">{e.dpt - e.hadir}</td>
                  <td className="py-2 text-right">
                    <Link href={`?tps=${encodeURIComponent(e.tps)}`} className="text-sm font-bold text-sky-800 underline">Buka</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Kartu>

      <Kartu>
        <h2 className="text-base font-bold text-sky-950">Cetak daftar hadir (untuk tanda tangan pemilih)</h2>
        <p className="mt-1 text-sm text-slate-700">
          Setiap baris nama setinggi 1 cm dan margin kecil, jadi satu lembar memuat banyak nama dengan kolom tanda tangan yang lega. Isinya mengikuti DPT versi {dpt.head.versi}.
        </p>
        <form action="/cetak/pilkades/hadir" target="_blank" className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm font-semibold text-slate-800">
            TPS
            <select name="tps" defaultValue={fTps} className={`${kolomKecil} mt-1 block w-full`}>
              <option value="">Semua TPS</option>
              {rekapList.map((e) => <option key={e.tps} value={e.tps}>{e.tps}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-800">
            Dusun
            <select name="dusun" defaultValue="" className={`${kolomKecil} mt-1 block w-full`}>
              <option value="">Semua dusun</option>
              {[...new Set(isi.map((r) => r.dusun).filter(Boolean))].sort((a, b) => a.localeCompare(b, "id")).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-800">
            Siapa yang dicetak
            <select name="tampil" defaultValue="semua" className={`${kolomKecil} mt-1 block w-full`}>
              <option value="semua">Semua pemilih di DPT</option>
              <option value="belum">Yang belum hadir saja</option>
              <option value="sudah">Yang sudah hadir saja</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-800">
            Tata letak
            <select name="tata" defaultValue="2kolom" className={`${kolomKecil} mt-1 block w-full`}>
              <option value="2kolom">2 kolom lanskap (paling banyak nama)</option>
              <option value="1kolom">1 kolom potret</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-800">
            Kertas
            <select name="kertas" defaultValue="f4" className={`${kolomKecil} mt-1 block w-full`}>
              <option value="f4">F4 / Folio</option>
              <option value="a4">A4</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-800">
            Baris kosong tambahan <span className="font-normal text-slate-600">(pemilih tambahan)</span>
            <input type="number" name="tambahan" min="0" max="100" defaultValue="0" className={`${kolomKecil} mt-1 block w-full`} />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 sm:col-span-2 lg:col-span-3">
            <input type="checkbox" name="nik" value="1" className="h-5 w-5" />
            Sertakan NIK (sebagian angka disamarkan)
          </label>
          <div className="sm:col-span-2 lg:col-span-3">
            <button className={tombol.sekunder}>Buka Pratinjau Cetak</button>
          </div>
        </form>
      </Kartu>

      <Kartu>
        <form className="flex flex-wrap items-end gap-3">
          <label className="flex-1 basis-56 text-sm font-semibold text-slate-800">
            Cari nama pemilih
            <input name="cari" defaultValue={sp.cari ?? ""} placeholder="Ketik nama…" autoFocus className={`${kolomKecil} mt-1 block w-full`} />
          </label>
          <label className="text-sm font-semibold text-slate-800">
            TPS
            <select name="tps" defaultValue={fTps} className={`${kolomKecil} mt-1 block`}>
              <option value="">Semua TPS</option>
              {rekapList.map((e) => <option key={e.tps} value={e.tps}>{e.tps}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-800">
            Tampilkan
            <select name="tampil" defaultValue={tampilPilihan} className={`${kolomKecil} mt-1 block`}>
              <option value="belum">Yang belum hadir</option>
              <option value="sudah">Yang sudah hadir</option>
              <option value="semua">Semuanya</option>
            </select>
          </label>
          <button className={tombol.sekunder}>Cari</button>
        </form>
        <p className="mt-3 text-sm text-slate-700">Menampilkan <b>{hasil.length}</b> pemilih.</p>
      </Kartu>

      <div className="overflow-x-auto rounded-xl border border-sky-100 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-sky-50 text-sm font-bold text-sky-900">
            <tr>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Dusun, RT/RW</th>
              <th className="px-4 py-3">TPS</th>
              <th className="px-4 py-3">Kehadiran</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tampil.map((r) => {
              const h = hadirMap.get(r.warga_id);
              return (
                <tr key={r.id} className="align-top">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{r.nama_lengkap}</p>
                    <p className="text-sm text-slate-500">NIK {r.nik_samar} · {r.jenis_kelamin === "L" ? "Laki-laki" : r.jenis_kelamin === "P" ? "Perempuan" : "-"}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-800">
                    {r.dusun ?? "-"}
                    <br />
                    {r.rt || r.rw ? `RT ${r.rt ?? "-"} / RW ${r.rw ?? "-"}` : "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-800">{r.tps_nama ?? "-"}</td>
                  <td className="px-4 py-3">
                    {h ? (
                      <div className="space-y-2">
                        <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
                          ✓ Hadir pukul {jam(h.hadir_pada)}
                        </span>
                        {h.dicatat_oleh_nama && <p className="text-sm text-slate-500">dicatat {h.dicatat_oleh_nama}</p>}
                        {bisaUbah && (
                          <details>
                            <summary className="cursor-pointer text-sm font-semibold text-red-700">Batalkan</summary>
                            <form action={batalHadir} className="mt-2 space-y-2 rounded-xl border border-red-200 bg-red-50 p-3">
                              <input type="hidden" name="periode_id" value={periode.id} />
                              <input type="hidden" name="warga_id" value={r.warga_id} />
                              <Penjaga />
                              <label className="block text-sm font-semibold text-red-950">
                                Alasan pembatalan (wajib)
                                <input name="alasan" required minLength={5} maxLength={300} placeholder="Contoh: salah mencatat nama" className={`${kolomKecil} mt-1 block w-full`} />
                              </label>
                              <TombolKonfirmasi
                                pesan={`Batalkan catatan hadir ${r.nama_lengkap}? Tercatat di Riwayat.`}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                              >
                                Batalkan catatan hadir
                              </TombolKonfirmasi>
                            </form>
                          </details>
                        )}
                      </div>
                    ) : bisaUbah ? (
                      <form action={catatHadir}>
                        <input type="hidden" name="periode_id" value={periode.id} />
                        <input type="hidden" name="warga_id" value={r.warga_id} />
                        <input type="hidden" name="nama" value={r.nama_lengkap} />
                        <Penjaga />
                        <button className={tombol.hijau}>Catat hadir</button>
                      </form>
                    ) : (
                      <span className="text-slate-500">Belum hadir</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!tampil.length && (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-500">Tidak ada pemilih yang cocok.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-700">
        <span>Halaman {halaman} dari {totalHal}</span>
        <span className="flex gap-3">
          {halaman > 1 && <Link href={qs({ hal: halaman - 1 })} className={tombol.sekunder}>← Sebelumnya</Link>}
          {halaman < totalHal && <Link href={qs({ hal: halaman + 1 })} className={tombol.sekunder}>Berikutnya →</Link>}
        </span>
      </div>

      <p className="text-sm text-slate-600">
        Aplikasi ini hanya mencatat siapa yang hadir. Pilihan pemilih tidak direkam sama sekali, sehingga pemungutan suara tetap rahasia.
      </p>
    </div>
  );
}
