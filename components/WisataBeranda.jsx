import Link from "next/link";
import { IconArrowRight } from "@/components/icons";
import KartuWisata from "@/components/KartuWisata";
import SectionHeading from "@/components/SectionHeading";

// Bagian "Wisata Desa" di beranda: maksimal 4 kartu (unggulan didahulukan),
// sisanya lewat tautan "Lihat semua". Kosong -> section tidak tampil.
export default function WisataBeranda({ items, totalSemua }) {
  if (!items || items.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <SectionHeading
        kecil="Jelajahi Desa"
        judul="Wisata Desa"
        deskripsi="Destinasi menarik yang bisa Anda kunjungi, dikelola langsung oleh pemerintah desa."
        aksi={
          totalSemua > items.length && (
            <Link
              href="/wisata"
              className="group inline-flex shrink-0 items-center gap-1.5 rounded-full border border-navy/15 bg-white/70 px-4 py-2 text-sm font-medium text-navy backdrop-blur transition hover:border-gold hover:bg-white hover:shadow-md"
            >
              Lihat semua wisata ({totalSemua})
              <IconArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          )
        }
      />

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <KartuWisata key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
