"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Tombol layar penuh (fullscreen) melayang di pojok kanan bawah — dipakai di
// semua halaman (publik & dashboard) karena dipasang di root layout.
// - Memakai Fullscreen API (+ awalan webkit untuk Safari lama).
// - Otomatis tersembunyi di perangkat yang tidak mendukung (mis. iPhone),
//   supaya tidak ada tombol yang tidak berfungsi.
// - Ikut berubah saat pengguna keluar dengan tombol Esc / F11.
function elemenLayarPenuh() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

export default function FullscreenButton() {
  const [didukung, setDidukung] = useState(false);
  const [aktif, setAktif] = useState(false);
  const [petunjuk, setPetunjuk] = useState(false);
  const timerPetunjuk = useRef(null);

  useEffect(() => {
    const ok = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
    setDidukung(ok);
    if (!ok) return undefined;

    // display-mode: fullscreen juga menyala saat pengguna menekan F11 di browser.
    const mq = window.matchMedia("(display-mode: fullscreen)");
    const sinkron = () => setAktif(!!elemenLayarPenuh() || mq.matches);
    sinkron();

    document.addEventListener("fullscreenchange", sinkron);
    document.addEventListener("webkitfullscreenchange", sinkron);
    mq.addEventListener?.("change", sinkron);
    return () => {
      document.removeEventListener("fullscreenchange", sinkron);
      document.removeEventListener("webkitfullscreenchange", sinkron);
      mq.removeEventListener?.("change", sinkron);
      clearTimeout(timerPetunjuk.current);
    };
  }, []);

  const alihkan = useCallback(async () => {
    try {
      if (elemenLayarPenuh()) {
        await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      } else if (aktif) {
        // Layar penuh dari F11 browser: tidak bisa ditutup lewat kode.
        setPetunjuk(true);
        clearTimeout(timerPetunjuk.current);
        timerPetunjuk.current = setTimeout(() => setPetunjuk(false), 2500);
      } else {
        const el = document.documentElement;
        await (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
      }
    } catch {
      // Ditolak browser (mis. di dalam iframe) — abaikan saja.
    }
  }, [aktif]);

  if (!didukung) return null;

  return (
    <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 flex items-center gap-2 print:hidden">
      {petunjuk && (
        <span
          role="status"
          className="rounded-lg bg-black/85 px-3 py-1.5 text-xs font-medium text-white shadow-lg"
        >
          Tekan F11 untuk keluar
        </span>
      )}
      <button
        type="button"
        onClick={alihkan}
        aria-label={aktif ? "Keluar dari layar penuh" : "Layar penuh"}
        aria-pressed={aktif}
        title={aktif ? "Keluar dari layar penuh (Esc)" : "Layar penuh"}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/75 text-white shadow-lg backdrop-blur transition hover:bg-royal focus:outline-none focus-visible:ring-2 focus-visible:ring-royal focus-visible:ring-offset-2"
      >
        {aktif ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 4v4a1 1 0 0 1-1 1H4M15 4v4a1 1 0 0 0 1 1h4M9 20v-4a1 1 0 0 0-1-1H4M15 20v-4a1 1 0 0 1 1-1h4" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4" />
          </svg>
        )}
      </button>
    </div>
  );
}
