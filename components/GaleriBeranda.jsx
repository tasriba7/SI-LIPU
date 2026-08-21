import Link from "next/link";
import { IconArrowRight } from "@/components/icons";
import GaleriGrid from "@/components/GaleriGrid";

const JUMLAH_TAMPIL = 8;

export default function GaleriBeranda({ items, totalSemua }) {
  // Belum ada foto sama sekali -> section ini tidak usah tampil di beranda,
  // supaya beranda tidak menampilkan ruang kosong kalau admin belum sempat
  // mengisi galeri.
  if (!items || items.length === 0) return null;

  return (
    <section className="bg-slate-50/70 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-seablue">
              Dokumentasi
            </p>
            <h2 className="mt-3 font-display text-2xl font-semibold text-navy sm:text-3xl">
              Galeri Kegiatan Desa
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
              Momen kegiatan dan aktivitas desa, didokumentasikan langsung
              oleh perangkat desa.
            </p>
          </div>
          {totalSemua > JUMLAH_TAMPIL && (
            <Link
              href="/galeri"
              className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-navy"
            >
              Lihat semua galeri
              <IconArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        <div className="mt-8">
          <GaleriGrid items={items} />
        </div>
      </div>
    </section>
  );
}
