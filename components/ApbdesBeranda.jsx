import Link from "next/link";
import { IconArrowRight } from "@/components/icons";
import { persen, rupiahRingkas } from "@/lib/apbdes";

function Kartu({ judul, data, warna }) {
  const p = persen(data.realisasi, data.anggaran);
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{judul}</p>
      <p className="mt-2 font-display text-2xl font-bold text-navy sm:text-3xl">{rupiahRingkas(data.anggaran)}</p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${warna}`} style={{ width: `${Math.min(p, 100)}%` }} />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Terealisasi {rupiahRingkas(data.realisasi)} <span className="text-slate-400">({p.toLocaleString("id-ID")}%)</span>
      </p>
    </div>
  );
}

// Ringkasan transparansi APBDes tahun terbit terbaru. Belum ada -> tidak tampil.
export default function ApbdesBeranda({ data }) {
  if (!data) return null;
  const { tahun, ringkasan } = data;

  return (
    <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-seablue">Transparansi</p>
          <h2 className="mt-3 font-display text-2xl font-semibold text-navy sm:text-3xl">APBDes {tahun}</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
            Anggaran Pendapatan dan Belanja Desa, dibuka untuk seluruh warga.
          </p>
        </div>
        <Link href={`/apbdes?tahun=${tahun}`} className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-navy">
          Lihat rincian lengkap
          <IconArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <Kartu judul="Pendapatan" data={ringkasan.pendapatan} warna="bg-emerald-500" />
        <Kartu judul="Belanja" data={ringkasan.belanja} warna="bg-gold" />
      </div>
    </section>
  );
}
