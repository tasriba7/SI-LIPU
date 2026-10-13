"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import FormPencarianSitus from "@/components/FormPencarianSitus";

// Tombol kaca pembesar di header publik. Diklik -> kotak cari terbuka di bawah
// header; tertutup saat mencari, pindah halaman, klik di luar, atau Esc.
export default function KotakCariHeader({ className = "" }) {
  const [buka, setBuka] = useState(false);
  const ref = useRef(null);
  const pathname = usePathname();

  useEffect(() => setBuka(false), [pathname]);

  useEffect(() => {
    if (!buka) return undefined;
    const luar = (e) => {
      if (!ref.current?.contains(e.target)) setBuka(false);
    };
    const esc = (e) => {
      if (e.key === "Escape") setBuka(false);
    };
    document.addEventListener("pointerdown", luar);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", luar);
      document.removeEventListener("keydown", esc);
    };
  }, [buka]);

  return (
    <div ref={ref} className={`relative shrink-0 ${className}`}>
      <button
        type="button"
        onClick={() => setBuka((v) => !v)}
        aria-label="Cari di situs"
        aria-expanded={buka}
        aria-haspopup="dialog"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/60 text-slate-700 ring-1 ring-slate-300/60 backdrop-blur transition hover:text-navy hover:ring-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          aria-hidden
          className="h-[18px] w-[18px]"
        >
          <circle cx="11" cy="11" r="7" />
          <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
        </svg>
      </button>

      {buka && (
        <div
          role="dialog"
          aria-label="Cari di situs"
          className="absolute right-0 top-full z-50 mt-3 w-[min(24rem,calc(100vw-2.5rem))] rounded-2xl bg-white p-3 shadow-xl shadow-navy/20 ring-1 ring-slate-200"
        >
          <FormPencarianSitus autoFocus onSelesai={() => setBuka(false)} ukuran="header" />
          <p className="mt-2 px-1 text-[11px] text-slate-400">
            Cari berita, pengumuman, layanan, wisata, dan profil desa.
          </p>
        </div>
      )}
    </div>
  );
}
