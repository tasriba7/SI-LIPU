"use client";

import { useEffect, useRef, useState } from "react";

// Latar bagian bawah beranda (di bawah hero) yang BERGANTI saat halaman di-scroll.
//
// Cara kerja:
//  - Isi halaman dibagi jadi beberapa kelompok. Tiap kelompok dibungkus
//    <div data-latar-grup="0|1|2|3"> di page.js.
//  - Satu lapisan latar bersifat `fixed` (menempel di layar), tapi DIPOTONG
//    ke batas pembungkus ini (clip-path: inset(0)) — jadi hero di atasnya
//    tidak ikut berubah dan latar tidak bocor ke footer.
//  - IntersectionObserver memantau kelompok mana yang sedang melewati bagian
//    tengah layar, lalu latar yang sesuai muncul pelan (crossfade) sementara
//    yang lain memudar.
//  - Tiap latar: foto (dari menu admin "Foto Beranda") yang zoom pelan +
//    kerudung warna terang supaya teks tetap terbaca + pendar warna melayang.
//    Kalau belum ada foto, yang tampil gradasi + pendar saja.

const LAPIS = [
  {
    // Sambutan & layanan
    kerudung: "from-white/75 via-royal-pale/60 to-white/75",
    pendar: "bg-royal/20",
    posisi: "50% 35%",
  },
  {
    // Struktur, cuaca, berita
    kerudung: "from-white/75 via-amber-50/60 to-white/75",
    pendar: "bg-gold/25",
    posisi: "20% 60%",
  },
  {
    // Wisata & galeri
    kerudung: "from-white/75 via-sky-50/60 to-white/75",
    pendar: "bg-navy/20",
    posisi: "80% 40%",
  },
  {
    // Statistik, APBDes, cara kerja
    kerudung: "from-stone-100/80 via-white/60 to-royal-pale/75",
    pendar: "bg-royal-light/20",
    posisi: "50% 80%",
  },
];

export default function LatarGulirBeranda({ foto = [], children }) {
  const wadah = useRef(null);
  const [aktif, setAktif] = useState(0);

  useEffect(() => {
    const el = wadah.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const grup = Array.from(el.querySelectorAll("[data-latar-grup]"));
    // Garis pantau tipis sedikit di atas tengah layar: kelompok yang
    // menyentuh garis ini dianggap sedang dibaca.
    const io = new IntersectionObserver(
      (entri) => {
        for (const e of entri) {
          if (e.isIntersecting) setAktif(Number(e.target.dataset.latarGrup) || 0);
        }
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 },
    );
    grup.forEach((g) => io.observe(g));
    return () => io.disconnect();
  }, []);

  // Foto hero memakai foto pertama; latar ini mulai dari foto kedua supaya
  // tidak sama dengan yang sedang dilihat di hero.
  const fotoUntuk = (i) => (foto.length > 0 ? foto[(i + 1) % foto.length] : null);

  return (
    <div ref={wadah} className="relative isolate [clip-path:inset(0)]">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-white">
        {LAPIS.map((l, i) => {
          const src = fotoUntuk(i);
          const nyala = aktif === i;
          return (
            <div
              key={i}
              className={`absolute inset-0 transition-opacity duration-[1400ms] ease-in-out motion-reduce:transition-none ${
                nyala ? "opacity-100" : "opacity-0"
              }`}
            >
              {src && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className={`latar-gulir-foto absolute inset-0 h-full w-full object-cover ${
                    nyala ? "latar-gulir-aktif" : ""
                  }`}
                  style={{ objectPosition: l.posisi }}
                />
              )}
              <div className={`absolute inset-0 bg-gradient-to-b ${l.kerudung}`} />
              <div
                className={`latar-gulir-pendar absolute -left-24 top-1/4 h-96 w-96 rounded-full blur-3xl ${l.pendar}`}
              />
              <div
                className={`latar-gulir-pendar absolute -right-24 bottom-1/4 h-80 w-80 rounded-full blur-3xl [animation-delay:-7s] ${l.pendar}`}
              />
            </div>
          );
        })}
      </div>

      {children}
    </div>
  );
}
