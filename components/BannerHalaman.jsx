import Reveal from "@/components/Reveal";
import { createClient } from "@/lib/supabase/server";
import { getBannerHalaman } from "@/lib/bannerHalaman";

// Banner judul halaman publik. Kalau admin sudah mengunggah gambar untuk menu
// ini (Dashboard > Pengaturan Desa > Banner Halaman), gambar jadi latar;
// kalau belum, tampil latar mesh gradasi navy dengan pendar warna logo.
// `ringkas` = lebih pendek, dipakai di Panel Warga yang punya banyak sub-halaman.
export default async function BannerHalaman({ kunci, kecil, judul, deskripsi, ringkas = false }) {
  const supabase = await createClient();
  const gambar = await getBannerHalaman(supabase, kunci);

  const padding = ringkas
    ? "py-10 md:py-14"
    : gambar
      ? "py-16 md:py-28"
      : "py-14 md:py-20";

  return (
    <section className="latar-mesh butiran relative overflow-hidden">
      {gambar && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={gambar}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-85"
        />
      )}
      {gambar && (
        <div className="absolute inset-0 bg-gradient-to-b from-navy-dark/65 via-navy-dark/55 to-navy-dark/90" />
      )}

      {/* Hiasan: pendar warna logo (statis, ringan) + tekstur titik yang memudar */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-16 h-72 w-72 rounded-full bg-navy/25 blur-3xl" />
        <div className="absolute -bottom-20 -right-16 h-72 w-72 rounded-full bg-gold/20 blur-3xl" />
        <div className="pola-titik absolute inset-0 [mask-image:radial-gradient(ellipse_at_50%_0%,black,transparent_72%)]" />
      </div>

      <div className={`relative mx-auto max-w-6xl px-6 text-center ${padding}`}>
        {kecil && (
          <Reveal variant="down">
            <p className="inline-flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.25em] text-gold">
              <span aria-hidden className="h-px w-6 bg-gradient-to-r from-transparent to-gold" />
              {kecil}
              <span aria-hidden className="h-px w-6 bg-gradient-to-l from-transparent to-gold" />
            </p>
          </Reveal>
        )}
        <Reveal delay={120}>
          <h1 className="mx-auto mt-3 max-w-3xl font-display text-3xl font-bold leading-[1.1] text-white drop-shadow-md sm:text-5xl">
            {judul}
          </h1>
        </Reveal>
        {!ringkas && (
          <Reveal delay={180}>
            <div className="ornamen mx-auto mt-5 max-w-[11rem]" aria-hidden>
              <span className="h-1.5 w-1.5 rotate-45 bg-gold" />
            </div>
          </Reveal>
        )}
        {deskripsi && (
          <Reveal delay={240}>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
              {deskripsi}
            </p>
          </Reveal>
        )}
      </div>
      <div className="relative h-1 w-full bg-gradient-to-r from-gold via-gold-light to-gold shadow-[0_0_14px_rgba(201,162,77,0.55)]" />
    </section>
  );
}
