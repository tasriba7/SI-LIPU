"use client";

import { useEffect, useState } from "react";

// Latar hero berupa beberapa foto yang bergantian tiap 5 detik dengan
// transisi pudar (crossfade) + zoom sangat pelan supaya terasa hidup tapi tidak ramai.
// - Berhenti saat tab tidak terlihat (hemat baterai/data).
// - Hanya satu foto -> tampil statis, tanpa timer.
// - "Kurangi gerakan" (prefers-reduced-motion) -> tanpa zoom, pudar tetap halus.
const JEDA_MS = 5000;

export default function HeroSlideshow({ images = [], className = "" }) {
  const [aktif, setAktif] = useState(0);
  const jumlah = images.length;

  useEffect(() => {
    if (jumlah < 2) return undefined;
    let timer = null;
    const mulai = () => {
      if (timer) return;
      timer = setInterval(() => setAktif((i) => (i + 1) % jumlah), JEDA_MS);
    };
    const henti = () => {
      clearInterval(timer);
      timer = null;
    };
    const saatVisibilitas = () => (document.hidden ? henti() : mulai());

    mulai();
    document.addEventListener("visibilitychange", saatVisibilitas);
    return () => {
      henti();
      document.removeEventListener("visibilitychange", saatVisibilitas);
    };
  }, [jumlah]);

  // Muat foto berikutnya lebih awal supaya pergantian tidak tersendat.
  useEffect(() => {
    if (jumlah < 2) return;
    const img = new window.Image();
    img.src = images[(aktif + 1) % jumlah].src;
  }, [aktif, jumlah, images]);

  if (jumlah === 0) return null;

  return (
    <div aria-hidden className={`absolute inset-0 overflow-hidden ${className}`}>
      {images.map((img, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={img.src}
          src={img.src}
          alt=""
          loading={i === 0 ? "eager" : "lazy"}
          decoding="async"
          className={`absolute inset-0 h-full w-full object-cover ${
            i === aktif ? "opacity-100 motion-safe:scale-100" : "opacity-0 motion-safe:scale-110"
          }`}
          // Pudar 1,4 dtk (halus), zoom pelan 6,5 dtk — durasi dibedakan lewat style.
          style={{ transition: "opacity 1400ms ease-in-out, transform 6500ms ease-out", willChange: "opacity, transform" }}
        />
      ))}
    </div>
  );
}
