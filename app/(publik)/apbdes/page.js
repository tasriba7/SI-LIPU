import Link from "next/link";
import BannerHalaman from "@/components/BannerHalaman";
import { IconDownload } from "@/components/icons";
import {
  JENIS_APBDES,
  getTahunTerbit,
  getApbdes,
  hitungRingkasan,
  kelompokkan,
  persen,
  rupiah,
  rupiahRingkas,
} from "@/lib/apbdes";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "APBDes — Transparansi Anggaran Desa" };

function BarPersen({ nilai, warna = "bg-navy" }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${warna}`} style={{ width: `${Math.min(nilai, 100)}%` }} />
      </div>
      <span className="w-12 text-right tabular-nums text-xs text-slate-500">{nilai.toLocaleString("id-ID")}%</span>
    </div>
  );
}

function KartuRingkas({ judul, nilai, sub, tone }) {
  const warna = tone === "negatif" ? "text-red-600" : "text-navy";
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{judul}</p>
      <p className={`mt-2 font-display text-xl font-bold sm:text-2xl ${warna}`}>{rupiahRingkas(nilai)}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function TabelJenis({ jenis, items }) {
  if (items.length === 0) return null;
  const grup = kelompokkan(items);
  const totalAng = items.reduce((a, i) => a + Number(i.anggaran), 0);
  const totalReal = items.reduce((a, i) => a + Number(i.realisasi), 0);

  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-semibold text-navy">{jenis.label}</h2>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-400">
              <th className="px-4 py-3 font-medium">Uraian</th>
              <th className="px-4 py-3 text-right font-medium">Anggaran</th>
              <th className="px-4 py-3 text-right font-medium">Realisasi</th>
              <th className="px-4 py-3 font-medium">Capaian</th>
            </tr>
          </thead>
          <tbody>
            {grup.map((g) => (
              <GrupBaris key={g.nama || "_"} g={g} adaNama={Boolean(g.nama)} />
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-navy/5 font-semibold text-navy">
              <td className="px-4 py-3">Total {jenis.label}</td>
              <td className="px-4 py-3 text-right tabular-nums">{rupiah(totalAng)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{rupiah(totalReal)}</td>
              <td className="px-4 py-3">
                <BarPersen nilai={persen(totalReal, totalAng)} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

function GrupBaris({ g, adaNama }) {
  return (
    <>
      {adaNama && (
        <tr className="bg-slate-50/70">
          <td className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{g.nama}</td>
          <td className="px-4 py-2.5 text-right text-xs font-semibold tabular-nums text-slate-500">{rupiah(g.anggaran)}</td>
          <td className="px-4 py-2.5 text-right text-xs font-semibold tabular-nums text-slate-500">{rupiah(g.realisasi)}</td>
          <td />
        </tr>
      )}
      {g.items.map((it) => (
        <tr key={it.id} className="border-t border-slate-100">
          <td className={`px-4 py-2.5 text-slate-700 ${adaNama ? "pl-8" : ""}`}>{it.uraian}</td>
          <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{rupiah(it.anggaran)}</td>
          <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{rupiah(it.realisasi)}</td>
          <td className="px-4 py-2.5">
            <BarPersen nilai={persen(it.realisasi, it.anggaran)} warna="bg-emerald-500" />
          </td>
        </tr>
      ))}
    </>
  );
}

export default async function ApbdesPublikPage({ searchParams }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const daftarTahun = await getTahunTerbit(supabase);

  if (daftarTahun.length === 0) {
    return (
      <main className="bg-white">
        <BannerHalaman kunci="apbdes" kecil="Transparansi" judul="APBDes" deskripsi="Anggaran Pendapatan dan Belanja Desa." />
        <section className="mx-auto max-w-3xl px-6 py-20 text-center">
          <p className="text-sm text-slate-400">
            Data APBDes sedang disiapkan oleh pemerintah desa. Silakan kembali lagi nanti.
          </p>
        </section>
      </main>
    );
  }

  const tahun = daftarTahun.includes(Number(sp?.tahun)) ? Number(sp.tahun) : daftarTahun[0];
  const { meta, items } = await getApbdes(supabase, tahun);
  const r = hitungRingkasan(items);

  // Porsi belanja per kelompok (bidang) — infografis batang sederhana.
  const belanja = kelompokkan(items.filter((i) => i.jenis === "belanja")).filter((g) => g.anggaran > 0);
  const maksBelanja = Math.max(1, ...belanja.map((g) => g.anggaran));

  return (
    <main className="bg-white pb-16">
      <BannerHalaman
        kunci="apbdes"
        kecil="Transparansi"
        judul={`APBDes ${tahun}`}
        deskripsi="Anggaran Pendapatan dan Belanja Desa — dibuka untuk seluruh warga."
      />

      <div className="mx-auto max-w-5xl px-6 pt-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {daftarTahun.map((t) => (
              <Link
                key={t}
                href={`/apbdes?tahun=${t}`}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                  t === tahun
                    ? "border-navy bg-navy text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-gold hover:text-navy"
                }`}
              >
                {t}
              </Link>
            ))}
          </div>
          {meta?.dokumen_url && (
            <a
              href={meta.dokumen_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-navy px-4 py-2 text-sm font-medium text-navy transition hover:bg-navy hover:text-white"
            >
              <IconDownload className="h-4 w-4" />
              Unduh dokumen APBDes (PDF)
            </a>
          )}
        </div>

        {meta?.catatan && (
          <p className="mt-6 whitespace-pre-line rounded-2xl border border-gold/40 bg-gold/10 p-5 text-sm leading-relaxed text-slate-700">
            {meta.catatan}
          </p>
        )}

        {items.length === 0 ? (
          <p className="mt-10 text-center text-sm text-slate-400">Rincian tahun ini belum diisi.</p>
        ) : (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KartuRingkas
                judul="Pendapatan"
                nilai={r.pendapatan.anggaran}
                sub={`Terealisasi ${rupiahRingkas(r.pendapatan.realisasi)}`}
              />
              <KartuRingkas
                judul="Belanja"
                nilai={r.belanja.anggaran}
                sub={`Terealisasi ${rupiahRingkas(r.belanja.realisasi)}`}
              />
              <KartuRingkas
                judul={r.surplus.anggaran >= 0 ? "Surplus anggaran" : "Defisit anggaran"}
                nilai={Math.abs(r.surplus.anggaran)}
                sub="Pendapatan dikurangi belanja"
                tone={r.surplus.anggaran < 0 ? "negatif" : undefined}
              />
              <KartuRingkas
                judul="Pembiayaan netto"
                nilai={r.pembiayaanNetto.anggaran}
                sub="Penerimaan dikurangi pengeluaran"
                tone={r.pembiayaanNetto.anggaran < 0 ? "negatif" : undefined}
              />
            </div>

            {belanja.length > 1 && (
              <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="font-display text-xl font-semibold text-navy">Ke mana uang desa dibelanjakan?</h2>
                <div className="mt-5 space-y-4">
                  {belanja.map((g) => (
                    <div key={g.nama || "_"}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="text-slate-700">{g.nama || "Lainnya"}</span>
                        <span className="shrink-0 tabular-nums text-slate-500">
                          {rupiahRingkas(g.anggaran)}{" "}
                          <span className="text-xs text-slate-400">
                            ({persen(g.anggaran, r.belanja.anggaran).toLocaleString("id-ID")}%)
                          </span>
                        </span>
                      </div>
                      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-navy to-seablue"
                          style={{ width: `${(g.anggaran / maksBelanja) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {JENIS_APBDES.map((j) => (
              <TabelJenis key={j.nilai} jenis={j} items={items.filter((i) => i.jenis === j.nilai)} />
            ))}
          </>
        )}
      </div>
    </main>
  );
}
