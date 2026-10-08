"use client";

import { useEffect, useRef, useState } from "react";

// Membungkus elemen supaya muncul halus (fade + naik) saat masuk layar.
// delay (ms) dipakai untuk memunculkan item berurutan. Hanya animasi sekali.
export default function Reveal({ children, delay = 0, className = "" }) {
  const ref = useRef(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShow(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShow(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: show ? `${delay}ms` : "0ms" }}
      className={`transition-[opacity,transform,filter] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[opacity,transform] motion-reduce:transform-none motion-reduce:opacity-100 motion-reduce:blur-none motion-reduce:transition-none ${
        show ? "translate-y-0 scale-100 opacity-100 blur-0" : "translate-y-10 scale-[0.98] opacity-0 blur-[2px]"
      } ${className}`}
    >
      {children}
    </div>
  );
}
