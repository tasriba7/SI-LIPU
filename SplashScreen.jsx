"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

/**
 * Splash screen SI-LIPU.
 * Ditampilkan begitu aplikasi dimuat, lalu fade-out otomatis
 * setelah durasi tertentu (default 1.6 detik) sebelum menampilkan
 * konten aplikasi yang sebenarnya (children).
 */
export default function SplashScreen({ children, minDurationMs = 1600 }) {
  const [visible, setVisible] = useState(true);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFadingOut(true), minDurationMs);
    const hideTimer = setTimeout(
      () => setVisible(false),
      minDurationMs + 500
    );
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [minDurationMs]);

  return (
    <>
      {visible && (
        <div
          className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-navy ${
            fadingOut ? "animate-fadeOut" : ""
          }`}
          aria-hidden={fadingOut}
        >
          <div className="animate-pulseSoft">
            <Image
              src="/logo-si-lipu.png"
              alt="Logo SI-LIPU"
              width={160}
              height={160}
              priority
              className="drop-shadow-xl"
            />
          </div>
          <p className="mt-6 text-white/80 text-sm tracking-widest animate-fadeIn">
            MEMUAT APLIKASI...
          </p>
        </div>
      )}
      {/* Konten aplikasi dirender dari awal juga (di-cover splash di atasnya)
          supaya begitu splash hilang, halaman sudah siap tanpa jeda. */}
      <div className={visible ? "invisible" : "animate-fadeIn"}>
        {children}
      </div>
    </>
  );
}
