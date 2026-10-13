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
    <div ref={wadah} className="relative isolate w-full max-w-full overflow-x-clip [clip-path:inset(0)]">
      {/* overflow-hidden + contain: semua yang menjulur (foto yang di-zoom,
          pendar warna) dipotong tepat di tepi layar, jadi TIDAK bisa melebarkan
          halaman atau memunculkan scroll samping. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 max-w-full overflow-hidden bg-white [contain:paint]"
      >
        {LAPIS.map((l, i) => {
          const src = fotoUntuk(i);
          const nyala = aktif === i;
          return (
            // Lapisan yang tidak aktif diberi `invisible` (setelah memudar) dan
            // animasinya dijeda lewat data-nyala (lihat globals.css), supaya
            // browser tidak terus menggambar 3 lapisan tak terlihat berisi foto
            // + pendar blur sambil halaman di-scroll.
            <div
              key={i}
              data-nyala={nyala ? "true" : "false"}
              className={`absolute inset-0 overflow-hidden transition-[opacity,visibility] duration-[1400ms] ease-in-out motion-reduce:transition-none ${
                nyala ? "visible opacity-100" : "invisible opacity-0"
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
                className={`latar-gulir-pendar absolute left-0 top-1/4 h-72 w-72 rounded-full blur-3xl sm:h-96 sm:w-96 ${l.pendar}`}
              />
              <div
                className={`latar-gulir-pendar absolute bottom-1/4 right-0 h-64 w-64 rounded-full blur-3xl [animation-delay:-7s] sm:h-80 sm:w-80 ${l.pendar}`}
              />
            </div>
          );
        })}
      </div>

      {children}
    </div>
  );
}
