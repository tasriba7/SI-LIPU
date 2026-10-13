"use client";

import { useEffect, useRef } from "react";

// Garis progres scroll di paling atas layar. Ringan: tidak memakai state
// React (tanpa render ulang tiap scroll), dibatasi sekali per frame lewat
// requestAnimationFrame, dan digerakkan dengan transform (dikerjakan GPU).
//
// Tinggi halaman (scrollHeight) hanya diukur saat ukuran berubah (resize /
// konten bertambah), BUKAN di setiap event scroll — membaca scrollHeight saat
// scroll bisa memaksa browser menghitung ulang layout di tengah gerakan scroll.
export default function ScrollProgressBar() {
  const batang = useRef(null);

  useEffect(() => {
    let frame = 0;
    let maks = 0;

    const ukur = () => {
      const el = document.documentElement;
      maks = el.scrollHeight - el.clientHeight;
    };

    const gambar = () => {
      frame = 0;
      const p = maks > 0 ? Math.min(Math.max(window.scrollY / maks, 0), 1) : 0;
      if (batang.current) batang.current.style.transform = `scaleX(${p})`;
    };
    const jadwalkan = () => {
      if (!frame) frame = requestAnimationFrame(gambar);
    };
    const saatUkuranBerubah = () => {
      ukur();
      jadwalkan();
    };

    window.addEventListener("scroll", jadwalkan, { passive: true });
    window.addEventListener("resize", saatUkuranBerubah);
    // Tinggi halaman bisa berubah setelah konten selesai dimuat.
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(saatUkuranBerubah) : null;
    ro?.observe(document.body);
    ukur();
    gambar();

    return () => {
      window.removeEventListener("scroll", jadwalkan);
      window.removeEventListener("resize", saatUkuranBerubah);
      ro?.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[3px]">
      <div
        ref={batang}
        className="h-full origin-left bg-gradient-to-r from-gold via-navy-light to-gold-light shadow-[0_0_8px_rgba(201,162,77,0.6)] will-change-transform"
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  );
}
