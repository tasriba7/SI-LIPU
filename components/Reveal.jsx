"use client";

import { useEffect, useRef, useState } from "react";

// Hook: true begitu elemen pertama kali terlihat di layar (hanya sekali).
// Sebelum itu, animasi/hitung angka TIDAK boleh jalan.
export function useInView({ threshold = 0.12, rootMargin = "0px 0px -40px 0px" } = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, rootMargin]);

  return [ref, inView];
}

// Posisi awal (sebelum terlihat). Semua ditulis utuh supaya terbaca Tailwind.
const AWAL = {
  up: "translate-y-8 scale-[0.98] opacity-0",
  down: "-translate-y-8 scale-[0.98] opacity-0",
  left: "-translate-x-8 scale-[0.98] opacity-0",
  right: "translate-x-8 scale-[0.98] opacity-0",
  zoom: "scale-95 opacity-0",
  fade: "opacity-0",
};

// Membungkus elemen supaya baru bergerak SAAT masuk layar; sebelum itu diam
// & tersembunyi. Hanya animasi sekali. Hormati "reduce motion" perangkat.
//   variant : "up" | "down" | "left" | "right" | "zoom" | "fade"
//   delay   : ms, untuk memunculkan item berurutan
//   duration: ms
//   blur    : efek fokus optik saat muncul. Matikan (blur={false}) untuk
//             pembungkus BESAR (seluruh section) supaya ringan di HP murah.
//
// Setelah animasi selesai, semua transform/filter/will-change DILEPAS
// (elemen kembali "polos"). Ini penting: transform & filter yang menempel
// terus membuat lapisan GPU tambahan per elemen, menjadikan elemen di
// dalamnya (position:fixed, backdrop-blur) berperilaku aneh.
export default function Reveal({
  children,
  delay = 0,
  variant = "up",
  duration = 850,
  blur = true,
  className = "",
  style = {},
}) {
  const [ref, show] = useInView();
  const [selesai, setSelesai] = useState(false);

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => setSelesai(true), delay + duration + 120);
    return () => clearTimeout(t);
  }, [show, delay, duration]);

  const awal = `${AWAL[variant] ?? AWAL.up}${blur ? " blur-[3px]" : ""}`;
  const akhir = `translate-x-0 translate-y-0 scale-100 opacity-100${blur ? " blur-0" : ""}`;

  let kelas;
  if (selesai) kelas = "transition-none"; // polos: tanpa transform/filter
  else
    kelas = `${
      blur ? "transition-[opacity,transform,filter]" : "transition-[opacity,transform]"
    } motion-reduce:transform-none motion-reduce:opacity-100 motion-reduce:blur-none motion-reduce:transition-none ${
      show ? akhir : awal
    }`;

  return (
    <div
      ref={ref}
      style={{
        ...style,
        transitionDuration: `${duration}ms`,
        transitionDelay: show && !selesai ? `${delay}ms` : "0ms",
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
        willChange:
          show && !selesai ? (blur ? "opacity, transform, filter" : "opacity, transform") : undefined,
      }}
      className={`${kelas} ${className}`}
    >
      {children}
    </div>
  );
}
