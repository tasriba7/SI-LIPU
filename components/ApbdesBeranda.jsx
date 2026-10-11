import Link from "next/link";
import { IconArrowRight } from "@/components/icons";
import SectionHeading from "@/components/SectionHeading";
import { persen, rupiahRingkas } from "@/lib/apbdes";

function Kartu({ judul, data, warna }) {
  const p = persen(data.realisasi, data.anggaran);
  return (
    <div className="bingkai-gradasi group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-navy/10">
      {/* Pendar halus di pojok, warnanya mengikuti jenis kartu */}
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-30 ${warna}`}
      />
      <p className="relative text-xs font-medium uppercase tracking-wider text-slate-400">{judul}</p>
      <p className="relative mt-2 font-display text-3xl font-bold text-navy sm:text-4xl">
        {rupiahRingkas(data.anggaran)}
      </p>
      <div className="relative mt-5 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`relative h-full origin-left rounded-full motion-safe:animate-isiBar ${warna}`}
          style={{ width: `${Math.min(p, 100)}%` }}
        >
          {/* Kilau tipis yang menyapu bar */}
          <span
            aria-hidden
            className="anim-saat-tampil absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/50 to-transparent motion-safe:animate-kilau"
          />
        </div>
      </div>
      <p className="relative mt-2.5 text-xs text-slate-500">
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
      <SectionHeading
        kecil="Transparansi"
        judul={`APBDes ${tahun}`}
        deskripsi="Anggaran Pendapatan dan Belanja Desa, dibuka untuk seluruh warga."
        aksi={
          <Link
            href={`/apbdes?tahun=${tahun}`}
            className="group inline-flex shrink-0 items-center gap-1.5 rounded-full border border-navy/15 bg-white/70 px-4 py-2 text-sm font-medium text-navy backdrop-blur transition hover:border-gold hover:bg-white hover:shadow-md"
          >
            Lihat rincian lengkap
            <IconArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        }
      />
      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <Kartu judul="Pendapatan" data={ringkasan.pendapatan} warna="bg-emerald-500" />
        <Kartu judul="Belanja" data={ringkasan.belanja} warna="bg-gold" />
      </div>
    </section>
  );
}
