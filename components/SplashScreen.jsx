"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

/**
 * Splash screen SI-LIPU.
 * Ditampilkan begitu aplikasi dimuat, lalu fade-out otomatis
 * setelah durasi tertentu (default 1.6 detik) sebelum menampilkan
 * konten aplikasi yang sebenarnya (children).
 */
const KUNCI_SESI = "silipu-splash-tampil";

export default function SplashScreen({ children, minDurationMs = 1600 }) {
  const [visible, setVisible] = useState(true);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    // Layar pembuka cukup sekali per sesi (per tab). Pemuatan ulang berikutnya
    // (refresh, pindah lewat form biasa) langsung menampilkan aplikasi.
    try {
      if (sessionStorage.getItem(KUNCI_SESI)) {
        setVisible(false);
        return;
      }
      sessionStorage.setItem(KUNCI_SESI, "1");
    } catch {
      // sessionStorage diblokir -> tetap tampilkan splash seperti biasa
    }
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
          data-splash-cover
          className={`latar-mesh butiran fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden ${
            fadingOut ? "animate-fadeOut" : ""
          }`}
          aria-hidden={fadingOut}
        >
          {/* Pendar emas di belakang logo + cincin cahaya memancar */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-[62%] rounded-full bg-gold/15 blur-3xl"
          />
          <div className="relative">
            <span
              aria-hidden
              className="absolute inset-[-14%] rounded-full border border-gold/40 motion-safe:animate-cincinDenyut"
            />
            <span
              aria-hidden
              className="absolute inset-[-14%] rounded-full border border-navy/40 motion-safe:animate-cincinDenyut [animation-delay:-1.4s]"
            />
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
          </div>
          <p className="mt-8 font-display text-2xl font-semibold tracking-[0.2em] text-white animate-fadeIn">
            SI-LIPU
          </p>
          <p className="mt-2 text-white/70 text-xs tracking-[0.3em] animate-fadeIn">
            MEMUAT APLIKASI...
          </p>
          {/* Garis kemajuan tipis yang terisi selama splash tampil */}
          <div aria-hidden className="mt-6 h-[3px] w-40 overflow-hidden rounded-full bg-white/15">
            <div className="h-full origin-left rounded-full bg-gradient-to-r from-gold via-gold-light to-navy-light motion-safe:animate-isiBar [animation-duration:1.8s]" />
          </div>
        </div>
      )}
      {/* Konten aplikasi dirender dari awal juga (di-cover splash di atasnya)
          supaya begitu splash hilang, halaman sudah siap tanpa jeda. */}
      <div data-splash-content className={visible ? "invisible" : "animate-fadeIn"}>
        {children}
      </div>
    </>
  );
}
