import Link from "next/link";
import { IconArrowRight } from "@/components/icons";
import KartuWisata from "@/components/KartuWisata";

// Bagian "Wisata Desa" di beranda: maksimal 4 kartu (unggulan didahulukan),
// sisanya lewat tautan "Lihat semua". Kosong -> section tidak tampil.
export default function WisataBeranda({ items, totalSemua }) {
  if (!items || items.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-seablue">Jelajahi Desa</p>
          <h2 className="mt-3 font-display text-2xl font-semibold text-navy sm:text-3xl">
            Wisata Desa
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
            Destinasi menarik yang bisa Anda kunjungi, dikelola langsung oleh pemerintah desa.
          </p>
        </div>
        {totalSemua > items.length && (
          <Link
            href="/wisata"
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-navy"
          >
            Lihat semua wisata ({totalSemua})
            <IconArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <KartuWisata key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
