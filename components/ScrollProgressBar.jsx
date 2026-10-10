"use client";

import { useEffect, useRef } from "react";

// Garis progres scroll di paling atas layar. Ringan: tidak memakai state
// React (tanpa render ulang tiap scroll), dibatasi sekali per frame lewat
// requestAnimationFrame, dan digerakkan dengan transform (dikerjakan GPU).
export default function ScrollProgressBar() {
  const batang = useRef(null);

  useEffect(() => {
    let frame = 0;

    const perbarui = () => {
      frame = 0;
      const el = document.documentElement;
      const maks = el.scrollHeight - el.clientHeight;
      const p = maks > 0 ? Math.min(Math.max(el.scrollTop / maks, 0), 1) : 0;
      if (batang.current) batang.current.style.transform = `scaleX(${p})`;
    };
    const jadwalkan = () => {
      if (!frame) frame = requestAnimationFrame(perbarui);
    };

    window.addEventListener("scroll", jadwalkan, { passive: true });
    window.addEventListener("resize", jadwalkan);
    // Tinggi halaman bisa berubah setelah konten selesai dimuat.
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(jadwalkan) : null;
    ro?.observe(document.body);
    perbarui();

    return () => {
      window.removeEventListener("scroll", jadwalkan);
      window.removeEventListener("resize", jadwalkan);
      ro?.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[3px]">
      <div
        ref={batang}
        className="h-full origin-left bg-gradient-to-r from-gold via-seablue to-gold-light shadow-[0_0_8px_rgba(232,185,51,0.6)] will-change-transform"
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  );
}
