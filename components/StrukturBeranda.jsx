import Link from "next/link";
import SectionHeading from "@/components/SectionHeading";
import BaganStruktur from "@/components/BaganStruktur";
import { IconArrowRight } from "@/components/icons";

// Bagian "Struktur Organisasi" di beranda: seluruh bagan perangkat desa,
// kepala desa di puncak. Kosong -> section tidak tampil (admin belum mengisi).
export default function StrukturBeranda({ pohon }) {
  if (!pohon || pohon.length === 0) return null;

  return (
    <section id="struktur-organisasi" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-16 md:py-24">
      <SectionHeading
        rata="tengah"
        kecil="Pemerintahan Desa"
        judul="Struktur Organisasi"
        deskripsi="Perangkat desa yang melayani warga, dari Kepala Desa hingga jajaran di bawahnya."
      />
      <div className="mt-12">
        <BaganStruktur pohon={pohon} />
      </div>
      <div className="mt-6 flex justify-center">
        <Link
          href="/struktur-organisasi"
          className="group inline-flex items-center gap-1.5 rounded-full border border-royal/20 bg-white/80 px-4 py-2 text-sm font-medium text-royal backdrop-blur transition hover:border-royal hover:bg-white hover:shadow-md"
        >
          Buka halaman Struktur Organisasi
          <IconArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  );
}
