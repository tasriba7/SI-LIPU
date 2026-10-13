"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// Kotak cari situs (dipakai di header dan di halaman /cari). Berpindah ke
// /cari?q=... lewat router Next.js, jadi tidak memuat ulang seluruh aplikasi.
// Pembersihan kata kunci yang sebenarnya dilakukan di server (lib/pencarian.js);
// di sini hanya merapikan spasi dan membatasi panjang.
export default function FormPencarianSitus({
  nilaiAwal = "",
  autoFocus = false,
  onSelesai,
  className = "",
  ukuran = "biasa",
}) {
  const router = useRouter();
  const [teks, setTeks] = useState(nilaiAwal);
  const [pending, mulai] = useTransition();
  const input = useRef(null);

  useEffect(() => {
    setTeks(nilaiAwal);
  }, [nilaiAwal]);

  useEffect(() => {
    if (autoFocus) input.current?.focus();
  }, [autoFocus]);

  function kirim(e) {
    e.preventDefault();
    const q = teks.replace(/\s+/g, " ").trim().slice(0, 60);
    if (!q) return;
    mulai(() => {
      router.push(`/cari?q=${encodeURIComponent(q)}`);
      onSelesai?.();
    });
  }

  const besar = ukuran === "besar";

  return (
    <form onSubmit={kirim} role="search" aria-busy={pending} className={className}>
      <label htmlFor={`cari-${ukuran}`} className="sr-only">
        Cari di situs desa
      </label>
      <div
        className={`flex items-center gap-2 rounded-full border border-slate-300 bg-white pl-4 pr-1.5 shadow-sm focus-within:border-gold focus-within:ring-2 focus-within:ring-gold/30 ${
          besar ? "py-1.5" : "py-1"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
          className="h-4 w-4 shrink-0 text-slate-400"
        >
          <circle cx="11" cy="11" r="7" />
          <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
        </svg>
        <input
          id={`cari-${ukuran}`}
          ref={input}
          type="search"
          name="q"
          value={teks}
          onChange={(e) => setTeks(e.target.value)}
          maxLength={60}
          autoComplete="off"
          placeholder="Cari berita, layanan, pengumuman, profil…"
          className={`min-w-0 flex-1 bg-transparent text-slate-800 outline-none placeholder:text-slate-400 ${
            besar ? "py-1.5 text-base" : "py-1 text-sm"
          }`}
        />
        <button
          type="submit"
          disabled={pending}
          className={`shrink-0 rounded-full bg-navy font-semibold text-white transition hover:bg-navy-dark disabled:opacity-60 ${
            besar ? "px-5 py-2 text-sm" : "px-4 py-1.5 text-xs"
          }`}
        >
          {pending ? "Mencari…" : "Cari"}
        </button>
      </div>
    </form>
  );
}
