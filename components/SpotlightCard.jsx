"use client";

import { useRef } from "react";

// Pembungkus kartu dengan sorot cahaya yang mengikuti kursor (efek "spotlight").
// Murni tampilan: hanya menulis dua variabel CSS (--mx, --my) ke elemennya
// sendiri; gambar sorotnya ada di styles/globals.css (.kartu-sorot).
// Tidak memakai state React, jadi tidak ada render ulang saat kursor bergerak.
// Isi kartu (children) tetap Server Component biasa — tautan di dalamnya
// berfungsi seperti semula.
export default function SpotlightCard({ children, className = "" }) {
  const ref = useRef(null);

  const saatGeser = (e) => {
    const el = ref.current;
    if (!el) return;
    const kotak = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - kotak.left}px`);
    el.style.setProperty("--my", `${e.clientY - kotak.top}px`);
  };

  return (
    <div ref={ref} onPointerMove={saatGeser} className={`kartu-sorot ${className}`}>
      {children}
    </div>
  );
}
