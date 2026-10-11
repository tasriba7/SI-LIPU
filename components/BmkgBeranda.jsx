import Link from "next/link";
import { IconArrowRight } from "@/components/icons";
import SectionHeading from "@/components/SectionHeading";
import { getCuacaDesa, getGempaTerbaru } from "@/lib/bmkg";
import { AtribusiBmkg, KartuCuacaSekarang, KartuGempaUtama } from "@/components/BmkgKomponen";

// Bagian "Cuaca & Gempa" di beranda: cuaca desa saat ini + gempa terbaru dari BMKG.
// Server Component yang mengambil datanya sendiri (sudah di-cache, lihat lib/bmkg.js),
// dibungkus <Suspense> di beranda supaya halaman tidak menunggu BMKG.
// Kalau BMKG tidak bisa dihubungi dan tidak ada data sama sekali -> section tidak tampil.
export default async function BmkgBeranda({ config }) {
  const [cuaca, gempa] = await Promise.all([getCuacaDesa(config), getGempaTerbaru()]);

  const adaCuaca = cuaca.status === "ok" && cuaca.sekarang;
  if (!adaCuaca && !gempa) return null;

  const titikDesa = adaCuaca ? { lat: cuaca.lokasi.lat, lon: cuaca.lokasi.lon } : null;

  return (
    <section id="cuaca-gempa" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-16 md:py-24">
      <SectionHeading
        kecil="Info BMKG"
        judul="Cuaca & Gempa"
        deskripsi="Prakiraan cuaca wilayah desa dan gempa bumi terkini, langsung dari BMKG."
        aksi={
          <Link
            href="/cuaca"
            className="group inline-flex shrink-0 items-center gap-1.5 rounded-full border border-navy/15 bg-white/70 px-4 py-2 text-sm font-medium text-navy backdrop-blur transition hover:border-gold hover:bg-white hover:shadow-md"
          >
            Lihat selengkapnya
            <IconArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        }
      />

      <div
        className={`mt-10 grid gap-6 ${adaCuaca && gempa ? "lg:grid-cols-2" : "mx-auto max-w-3xl"}`}
      >
        {adaCuaca && <KartuCuacaSekarang cuaca={cuaca} ringkas />}
        {gempa && <KartuGempaUtama gempa={gempa} titikDesa={titikDesa} tampilkanPeta={false} ringkas />}
      </div>

      <AtribusiBmkg className="mt-6 text-center" />
    </section>
  );
}
