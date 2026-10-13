"use client";

import { useEffect, useRef, useState } from "react";

// Tombol panah "kembali ke atas" di pojok kanan bawah halaman publik.
// - Muncul pelan setelah halaman digulir cukup jauh (JARAK_MUNCUL), hilang lagi
//   saat sudah dekat bagian atas.
// - Sekali klik, halaman menggulir ke atas dengan halus (smooth). Kalau
//   pengguna mengaktifkan "kurangi gerakan" di perangkatnya, langsung loncat.
// - Ringan: tanpa render ulang tiap scroll (state hanya berubah saat melewati
//   ambang), dibatasi sekali per frame lewat requestAnimationFrame.
// - Diletakkan DI ATAS tombol layar penuh (components/FullscreenButton.jsx,
//   pojok kanan bawah) supaya keduanya tidak bertumpuk.
const JARAK_MUNCUL = 400;

export default function ScrollKeAtas() {
  const [tampil, setTampil] = useState(false);
  const frame = useRef(0);

  useEffect(() => {
    const periksa = () => {
      frame.current = 0;
      setTampil(window.scrollY > JARAK_MUNCUL);
    };
    const jadwalkan = () => {
      if (!frame.current) frame.current = requestAnimationFrame(periksa);
    };

    window.addEventListener("scroll", jadwalkan, { passive: true });
    periksa();
    return () => {
      window.removeEventListener("scroll", jadwalkan);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, []);

  const keAtas = () => {
    const kurangiGerakan = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: kurangiGerakan ? "auto" : "smooth" });
  };

  return (
    <button
      type="button"
      onClick={keAtas}
      aria-label="Kembali ke atas"
      title="Kembali ke atas"
      aria-hidden={!tampil}
      tabIndex={tampil ? 0 : -1}
      className={`fixed bottom-[calc(max(1rem,env(safe-area-inset-bottom))_+_3.25rem)] right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-navy text-gold-light shadow-lg shadow-navy/30 ring-1 ring-white/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold motion-reduce:transition-none print:hidden ${
        tampil ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        aria-hidden
        className="h-5 w-5"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}
