"use client";

import { useEffect, useState } from "react";
import Reveal, { useInView } from "@/components/Reveal";
import { IconUsers, IconIdCard, IconClipboardCheck } from "@/components/icons";

// Konfigurasi kartu didefinisikan DI SINI (bukan di page.js) karena
// referensi komponen ikon (fungsi) tidak boleh dioper dari Server
// Component ke Client Component lewat props — hanya data serializable
// (angka, string, dll) yang boleh lewat.
const STAT_CARDS = [
  { key: "totalPenduduk", label: "Jumlah Penduduk", icon: IconUsers },
  { key: "totalKepalaKeluarga", label: "Jumlah Kepala Keluarga", icon: IconIdCard },
  { key: "totalAjuanDiproses", label: "Ajuan Sudah Diproses", icon: IconClipboardCheck },
];

// Satu kartu statistik: nomor animasi count-up ringan + hover halus
// (terangkat tipis, border menyala) — elegan, bukan ramai.
function StatCard({ icon: Icon, label, value, suffix = "" }) {
  const [displayValue, setDisplayValue] = useState(0);
  const [ref, inView] = useInView({ threshold: 0.3, rootMargin: "0px" });

  // Animasi count-up dari 0 ke nilai asli, dengan easing supaya tidak
  // terasa kaku/linear.
  useEffect(() => {
    if (!inView) return; // jangan mulai hitung sebelum kartu terlihat
    const target = Number(value) || 0;
    if (target === 0) {
      setDisplayValue(0);
      return;
    }
    const duration = 1000;
    const start = performance.now();

    let frame;
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
      setDisplayValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, inView]);

  return (
    <div ref={ref} className="kaca group relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl px-6 py-6 text-center transition-all sm:flex-row sm:gap-4 sm:text-left duration-300 ease-out hover:-translate-y-1.5 hover:border-gold/50 hover:bg-white/[0.12]">
      {/* Pendar emas di pojok yang menyala saat kartu disorot */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gold/0 blur-2xl transition-colors duration-500 group-hover:bg-gold/25"
      />
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-gold-light text-navy-dark shadow-lg shadow-gold/20 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
        <Icon className="h-5 w-5" />
      </div>

      <div className="relative">
        <p className="font-display text-4xl font-semibold tabular-nums leading-none text-white">
          {displayValue.toLocaleString("id-ID")}
          {suffix}
        </p>
        <p className="mt-1.5 text-sm text-white/60">{label}</p>
      </div>
    </div>
  );
}

export default function StatBerandaCards({ stats }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
      {STAT_CARDS.map((c, i) => (
        <Reveal key={c.key} delay={i * 130} variant="up" className="h-full">
          <StatCard {...c} value={stats[c.key]} />
        </Reveal>
      ))}
    </div>
  );
}
