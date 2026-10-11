import Link from "next/link";
import { IconArrowRight } from "@/components/icons";
import GaleriGrid from "@/components/GaleriGrid";
import SectionHeading from "@/components/SectionHeading";

const JUMLAH_TAMPIL = 8;

export default function GaleriBeranda({ items, totalSemua }) {
  // Belum ada foto sama sekali -> section ini tidak usah tampil di beranda,
  // supaya beranda tidak menampilkan ruang kosong kalau admin belum sempat
  // mengisi galeri.
  if (!items || items.length === 0) return null;

  return (
    <section className="bg-white/40 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          kecil="Dokumentasi"
          judul="Galeri Kegiatan Desa"
          deskripsi="Momen kegiatan dan aktivitas desa, didokumentasikan langsung oleh perangkat desa."
          aksi={
            totalSemua > JUMLAH_TAMPIL && (
              <Link
                href="/galeri"
                className="group inline-flex shrink-0 items-center gap-1.5 rounded-full border border-navy/15 bg-white/70 px-4 py-2 text-sm font-medium text-navy backdrop-blur transition hover:border-gold hover:bg-white hover:shadow-md"
              >
                Lihat semua galeri
                <IconArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            )
          }
        />

        <div className="mt-10">
          <GaleriGrid items={items} />
        </div>
      </div>
    </section>
  );
}
