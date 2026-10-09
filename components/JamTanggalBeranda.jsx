"use client";

import { useEffect, useState } from "react";
import { IconCalendarRange, IconClock } from "@/components/icons";
import { formatWaktuBeranda } from "@/lib/waktuLokal";

// Strip hari, tanggal, dan jam (sampai detik) di puncak beranda, tepat di
// bawah header. Waktu mengikuti zona waktu perangkat pengunjung.
//
// Saat render di server, waktu belum diketahui (zona server ≠ zona warga),
// jadi yang tampil dulu hanya kerangka dengan tinggi tetap — begitu dimuat
// di browser, waktu langsung terisi tanpa membuat halaman bergeser.
export default function JamTanggalBeranda() {
  const [w, setW] = useState(null);

  useEffect(() => {
    let timer;
    const perbarui = () => setW(formatWaktuBeranda(new Date()));
    // Tiap tick dijadwalkan tepat di pergantian detik berikutnya, supaya
    // angka detik tidak tertinggal/loncat seperti setInterval biasa.
    const tick = () => {
      perbarui();
      timer = setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    };
    tick();
    // Kembali ke tab ini setelah lama di tab lain: langsung segarkan.
    const saatTampil = () => {
      if (document.visibilityState === "visible") perbarui();
    };
    document.addEventListener("visibilitychange", saatTampil);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", saatTampil);
    };
  }, []);

  return (
    <div className="relative border-b border-gold/25 bg-gradient-to-r from-navy-dark via-navy to-navy-dark">
      {/* Kilau tipis di tepi atas, aksen "kop surat" senada header. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      <div className="mx-auto flex min-h-[58px] max-w-6xl items-center justify-between gap-3 px-5 py-2 sm:min-h-[64px] sm:px-6">
        {/* Hari & tanggal */}
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-gold-light ring-1 ring-gold/30 sm:h-10 sm:w-10">
            <IconCalendarRange className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold sm:text-[11px]">
              {w ? w.hari : "\u00A0"}
            </p>
            <p className="truncate text-[13px] font-medium text-white sm:text-[15px]">
              {w ? w.tanggal : "\u00A0"}
            </p>
          </div>
        </div>

        {/* Jam sampai detik */}
        <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
          <span className="hidden items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 font-mono text-[10px] font-semibold tracking-widest text-gold-light ring-1 ring-gold/30 min-[400px]:inline-flex sm:text-[11px]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-gold opacity-70 motion-safe:animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gold" />
            </span>
            {w ? w.zona : "···"}
          </span>

          <div className="flex items-center gap-2">
            <IconClock className="hidden h-5 w-5 text-gold-light/80 sm:block" />
            {/* Angka jam berubah tiap detik: disembunyikan dari pembaca layar
                (agar tidak dibacakan terus-menerus); yang dibacakan hanya
                jam & menit lewat teks sr-only di bawah. */}
            <p
              aria-hidden="true"
              className="font-mono text-[22px] font-semibold leading-none tracking-wider text-white tabular-nums sm:text-[28px]"
            >
              {w ? (
                <>
                  {w.jam}
                  <span className="mx-px text-gold motion-safe:animate-pulse">:</span>
                  {w.menit}
                  <span className="mx-px text-gold motion-safe:animate-pulse">:</span>
                  <span className="text-gold-light">{w.detik}</span>
                </>
              ) : (
                <span className="text-white/30">––:––:––</span>
              )}
            </p>
            {w && (
              <span className="sr-only">
                Pukul {w.jam}.{w.menit} {w.zona}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
