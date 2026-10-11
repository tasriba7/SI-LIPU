import Link from "next/link";
import { IconArrowRight } from "@/components/icons";
import KartuBerita from "@/components/KartuBerita";
import SectionHeading from "@/components/SectionHeading";

// "Berita Terbaru" di beranda: 3 kartu. Belum ada berita terbit -> tidak tampil.
export default function BeritaBeranda({ items, totalSemua }) {
  if (!items || items.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <SectionHeading
        kecil="Kabar Desa"
        judul="Berita Terbaru"
        deskripsi="Informasi dan perkembangan terkini dari pemerintah desa."
        aksi={
          totalSemua > items.length && (
            <Link
              href="/berita"
              className="group inline-flex shrink-0 items-center gap-1.5 rounded-full border border-navy/15 bg-white/70 px-4 py-2 text-sm font-medium text-navy backdrop-blur transition hover:border-gold hover:bg-white hover:shadow-md"
            >
              Lihat semua berita ({totalSemua})
              <IconArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          )
        }
      />
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <KartuBerita key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
