import Reveal from "@/components/Reveal";
import { createClient } from "@/lib/supabase/server";
import { getBannerHalaman } from "@/lib/bannerHalaman";

// Banner judul halaman publik. Kalau admin sudah mengunggah gambar untuk menu
// ini (Dashboard > Pengaturan Desa > Banner Halaman), gambar jadi latar;
// kalau belum, tampil polos navy seperti sebelumnya.
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
    <section className="relative overflow-hidden bg-navy-dark">
      {gambar && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={gambar}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-85"
        />
      )}
      {gambar && (
        <div className="absolute inset-0 bg-gradient-to-b from-navy-dark/60 via-navy-dark/55 to-navy-dark/85" />
      )}

      <div className={`relative mx-auto max-w-6xl px-6 text-center ${padding}`}>
        {kecil && (
          <Reveal variant="down">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-gold">{kecil}</p>
          </Reveal>
        )}
        <Reveal delay={120}>
          <h1 className="mx-auto mt-3 max-w-3xl font-display text-3xl font-bold text-white drop-shadow-md sm:text-5xl">
            {judul}
          </h1>
        </Reveal>
        {deskripsi && (
          <Reveal delay={240}>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
              {deskripsi}
            </p>
          </Reveal>
        )}
      </div>
      <div className="relative h-1 w-full bg-gradient-to-r from-gold via-gold-light to-gold" />
    </section>
  );
}
