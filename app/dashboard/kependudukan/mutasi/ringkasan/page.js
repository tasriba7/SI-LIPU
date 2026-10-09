import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NAMA_BULAN } from "@/lib/statusPenduduk";

const JENIS = ["meninggal", "pindah_keluar", "datang"];
const JUDUL = { meninggal: "Meninggal", pindah_keluar: "Pindah keluar", datang: "Datang" };

function angka(n) {
  return Number(n || 0).toLocaleString("id-ID");
}

function Sel({ nilai, tebal = false }) {
  const { jumlah, laki, perempuan } = nilai;
  return (
    <td className="border-b border-slate-100 px-3 py-2 text-right tabular-nums">
      <span className={tebal ? "font-semibold text-slate-800" : "text-slate-700"}>{angka(jumlah)}</span>
      {jumlah > 0 && (
        <span className="ml-1.5 text-[10px] text-slate-400">
          L{angka(laki)}/P{angka(perempuan)}
        </span>
      )}
    </td>
  );
}

export default async function RingkasanMutasiPage({ searchParams }) {
  const sp = await searchParams;
  const tahunIni = new Date().getFullYear();

  const supabase = await createClient();

  // Tahun tertua yang punya catatan, supaya pilihan tahun tidak kosong/berlebihan.
  const { data: tertua } = await supabase
    .from("mutasi_penduduk")
    .select("tanggal")
    .order("tanggal", { ascending: true })
    .limit(1)
    .maybeSingle();
  const tahunAwal = Math.min(
    tahunIni,
    tertua?.tanggal ? Number(String(tertua.tanggal).slice(0, 4)) || tahunIni : tahunIni
  );
  const daftarTahun = [];
  for (let t = tahunIni; t >= tahunAwal; t--) daftarTahun.push(t);

  const diminta = /^\d{4}$/.test(sp?.tahun ?? "") ? Number(sp.tahun) : tahunIni;
  const tahun = diminta >= 2000 && diminta <= tahunIni + 1 ? diminta : tahunIni;

  const { data, error } = await supabase.rpc("ringkasan_mutasi_bulanan", { p_tahun: tahun });

  const kosong = () => ({ jumlah: 0, laki: 0, perempuan: 0 });
  const tabel = Array.from({ length: 12 }, () =>
    Object.fromEntries(JENIS.map((j) => [j, kosong()]))
  );
  const total = Object.fromEntries(JENIS.map((j) => [j, kosong()]));
  for (const r of data ?? []) {
    const b = Number(r.bulan) - 1;
    if (!tabel[b] || !JENIS.includes(r.jenis)) continue;
    const isi = {
      jumlah: Number(r.jumlah) || 0,
      laki: Number(r.laki) || 0,
      perempuan: Number(r.perempuan) || 0,
    };
    tabel[b][r.jenis] = isi;
    total[r.jenis].jumlah += isi.jumlah;
    total[r.jenis].laki += isi.laki;
    total[r.jenis].perempuan += isi.perempuan;
  }
  const selisih = (x) => x.datang.jumlah - x.pindah_keluar.jumlah - x.meninggal.jumlah;
  const warnaSelisih = (n) =>
    n > 0 ? "text-emerald-700" : n < 0 ? "text-red-600" : "text-slate-500";
  const tanda = (n) => (n > 0 ? `+${angka(n)}` : n < 0 ? `-${angka(Math.abs(n))}` : "0");

  return (
    <div className="space-y-4">
      <div>
        <Link href="/dashboard/kependudukan/mutasi" className="text-sm text-slate-400 hover:text-slate-600">
          &larr; Kembali ke Mutasi Penduduk
        </Link>
        <h1 className="mt-2 text-lg font-bold text-slate-800">Ringkasan Mutasi per Bulan</h1>
        <p className="mt-0.5 max-w-2xl text-sm text-slate-500">
          Jumlah penduduk meninggal, pindah keluar, dan datang tiap bulan (berdasarkan tanggal
          kejadian). Catatan yang dibatalkan tidak dihitung. L = laki-laki, P = perempuan.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-400">Tahun:</span>
        {daftarTahun.map((t) => (
          <Link
            key={t}
            href={`/dashboard/kependudukan/mutasi/ringkasan?tahun=${t}`}
            className={`rounded-lg border px-3 py-1.5 font-medium ${
              tahun === t
                ? "border-navy bg-navy/5 text-navy"
                : "border-slate-300 text-slate-500 hover:bg-slate-50"
            }`}
          >
            {t}
          </Link>
        ))}
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-medium">Ringkasan belum bisa dimuat.</p>
          <p className="mt-0.5">
            Pastikan migrasi <code className="font-mono">0033_pindah_datang_dan_ringkasan_mutasi.sql</code>{" "}
            sudah dijalankan di Supabase (SQL Editor), lalu muat ulang halaman ini.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-auto">
            <table className="w-full min-w-[640px] border-separate border-spacing-0 text-[13px]">
              <thead>
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="border-b border-slate-200 bg-slate-100 px-3 py-2.5">Bulan</th>
                  {JENIS.map((j) => (
                    <th key={j} className="border-b border-slate-200 bg-slate-100 px-3 py-2.5 text-right">
                      {JUDUL[j]}
                    </th>
                  ))}
                  <th className="border-b border-slate-200 bg-slate-100 px-3 py-2.5 text-right">
                    Tambah/kurang
                  </th>
                </tr>
              </thead>
              <tbody>
                {tabel.map((baris, i) => {
                  const s = selisih(baris);
                  return (
                    <tr key={i} className="odd:bg-white even:bg-slate-50/60">
                      <td className="border-b border-slate-100 px-3 py-2 font-medium text-slate-700">
                        {NAMA_BULAN[i]}
                      </td>
                      {JENIS.map((j) => (
                        <Sel key={j} nilai={baris[j]} />
                      ))}
                      <td
                        className={`border-b border-slate-100 px-3 py-2 text-right font-medium tabular-nums ${warnaSelisih(s)}`}
                      >
                        {tanda(s)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100">
                  <td className="px-3 py-2.5 text-[12px] font-bold text-slate-800">Jumlah {tahun}</td>
                  {JENIS.map((j) => (
                    <Sel key={j} nilai={total[j]} tebal />
                  ))}
                  <td
                    className={`px-3 py-2.5 text-right font-bold tabular-nums ${warnaSelisih(selisih(total))}`}
                  >
                    {tanda(selisih(total))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <p className="max-w-2xl text-xs text-slate-400">
        &quot;Tambah/kurang&quot; = datang &minus; pindah keluar &minus; meninggal. Kelahiran dan data
        yang ditambahkan lewat Tambah Warga atau Import Excel tidak termasuk dalam angka ini.
      </p>
    </div>
  );
}
