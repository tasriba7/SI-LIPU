"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconClose } from "@/components/icons";

function formatTanggal(iso) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function GaleriGrid({ items }) {
  const [aktif, setAktif] = useState(null);
  // true kalau dibuka lewat klik/tap (mis. di hp, atau klik sengaja di
  // laptop) — bedanya dari pratinjau saat hover: dikunci layarnya (tidak
  // ikut scroll) dan cuma tertutup lewat tombol X / klik luar / Esc,
  // bukan otomatis hilang saat kursor lewat.
  const [terkunci, setTerkunci] = useState(false);
  // Cuma laptop/desktop (perangkat dengan mouse yang bisa hover) yang
  // dapat pratinjau otomatis saat kursor diarahkan ke foto. Di hp,
  // "hover" tidak pernah aktif secara nyata jadi warga tetap ketuk foto
  // seperti biasa.
  const [hoverCapable, setHoverCapable] = useState(false);
  const closeTimer = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    setHoverCapable(mq.matches);
    const onChange = (e) => setHoverCapable(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Tutup modal dengan tombol Esc, dan kunci scroll body hanya saat foto
  // dibuka lewat klik/tap — supaya pratinjau hover tidak bikin scrollbar
  // "berkedip" setiap kursor lewat dari satu foto ke foto lain.
  useEffect(() => {
    if (!aktif) return;
    function handleKey(e) {
      if (e.key === "Escape") tutup();
    }
    document.addEventListener("keydown", handleKey);
    if (terkunci) {
      const overflowSebelumnya = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", handleKey);
        document.body.style.overflow = overflowSebelumnya;
      };
    }
    return () => document.removeEventListener("keydown", handleKey);
  }, [aktif, terkunci]);

  function bukaPratinjau(item) {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setAktif(item);
    setTerkunci(false);
  }

  function jadwalkanTutupPratinjau() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setAktif((sekarang) => (terkunci ? sekarang : null));
    }, 120);
  }

  function batalkanTutupPratinjau() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function bukaTerkunci(item) {
    batalkanTutupPratinjau();
    setAktif(item);
    setTerkunci(true);
  }

  function tutup() {
    batalkanTutupPratinjau();
    setAktif(null);
    setTerkunci(false);
  }

  if (!items || items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-14 text-center text-sm text-slate-400">
        Belum ada foto kegiatan yang diunggah.
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => bukaTerkunci(item)}
            onMouseEnter={() => hoverCapable && bukaPratinjau(item)}
            onMouseLeave={() => hoverCapable && jadwalkanTutupPratinjau()}
            onFocus={() => hoverCapable && bukaPratinjau(item)}
            onBlur={() => hoverCapable && jadwalkanTutupPratinjau()}
            className="group relative aspect-square overflow-hidden rounded-xl bg-slate-100 text-left"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.foto_url}
              alt={item.judul}
              loading="lazy"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-navy-dark/80 via-navy-dark/0 to-navy-dark/0 opacity-0 transition group-hover:opacity-100" />
            <p className="absolute inset-x-0 bottom-0 translate-y-2 px-3 pb-3 text-xs font-medium text-white opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
              {item.judul}
            </p>
          </button>
        ))}
      </div>

      {aktif &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-navy-dark/90 p-4 animate-fadeIn"
            onClick={tutup}
            onMouseEnter={() => hoverCapable && batalkanTutupPratinjau()}
            onMouseLeave={() => hoverCapable && jadwalkanTutupPratinjau()}
          >
            <button
              type="button"
              onClick={tutup}
              aria-label="Tutup"
              className="absolute right-4 top-4 text-white/70 hover:text-white"
            >
              <IconClose className="h-7 w-7" />
            </button>

            <div
              className="mx-auto max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex max-h-[60vh] w-full items-center justify-center bg-slate-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={aktif.foto_url}
                  alt={aktif.judul}
                  className="mx-auto max-h-[60vh] w-full object-contain"
                />
              </div>
              <div className="p-5 sm:p-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-seablue">
                  {formatTanggal(aktif.created_at)}
                </p>
                <h3 className="mt-1.5 font-display text-xl font-semibold text-slate-800">
                  {aktif.judul}
                </h3>
                {aktif.deskripsi && (
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-500">
                    {aktif.deskripsi}
                  </p>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
