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

// Posisi awal (sebelum terlihat) tiap jenis gerakan. Semua ditulis utuh
// supaya terbaca oleh Tailwind.
const AWAL = {
  up: "translate-y-10 scale-[0.98]",
  down: "-translate-y-8",
  left: "-translate-x-12",
  right: "translate-x-12",
  zoom: "scale-90",
  fade: "",
};

// Membungkus elemen supaya baru bergerak (fade + geser/zoom) SAAT masuk
// layar. Sebelum di-scroll sampai situ, elemen diam & tersembunyi.
//   variant: "up" | "down" | "left" | "right" | "zoom" | "fade"
//   delay (ms): untuk memunculkan item berurutan (stagger)
// Hanya animasi sekali. Hormati "reduce motion" milik perangkat.
export default function Reveal({
  children,
  delay = 0,
  variant = "up",
  className = "",
}) {
  const [ref, show] = useInView();

  return (
    <div
      ref={ref}
      style={{ transitionDelay: show ? `${delay}ms` : "0ms" }}
      className={`transition-[opacity,transform,filter] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[opacity,transform] motion-reduce:transform-none motion-reduce:opacity-100 motion-reduce:blur-none motion-reduce:transition-none ${
        show
          ? "translate-x-0 translate-y-0 scale-100 opacity-100 blur-0"
          : `${AWAL[variant] ?? AWAL.up} opacity-0 blur-[2px]`
      } ${className}`}
    >
      {children}
    </div>
  );
}
