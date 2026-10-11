"use client";

import { useEffect, useState } from "react";
import Reveal, { useInView } from "@/components/Reveal";
import { IconUsers, IconIdCard, IconClipboardCheck } from "@/components/icons";

// Konfigurasi kartu didefinisikan DI SINI (bukan di page.js) karena
// referensi komponen ikon (fungsi) tidak boleh dioper dari Server
// Component ke Client Component lewat props — hanya data serializable
// (angka, string, dll) yang boleh lewat.
const STAT_CARDS = [
  {
    key: "totalPenduduk",
    label: "Jumlah Penduduk",
    icon: IconUsers,
    ikon: "from-royal to-royal-light shadow-navy/35",
    garis: "from-royal to-royal-light",
    pendar: "group-hover:bg-navy/20",
  },
  {
    key: "totalKepalaKeluarga",
    label: "Jumlah Kepala Keluarga",
    icon: IconIdCard,
    ikon: "from-gold to-gold-light shadow-gold/40 !text-navy-dark",
    garis: "from-gold to-gold-light",
    pendar: "group-hover:bg-gold/25",
  },
  {
    key: "totalAjuanDiproses",
    label: "Ajuan Sudah Diproses",
    icon: IconClipboardCheck,
    ikon: "from-navy-light to-zinc-300 shadow-navy/35",
    garis: "from-navy-light to-zinc-300",
    pendar: "group-hover:bg-navy/20",
  },
];

// Satu kartu statistik: nomor animasi count-up ringan + hover halus
// (terangkat tipis, border menyala) — elegan, bukan ramai.
function StatCard({ icon: Icon, label, value, suffix = "", ikon, garis, pendar }) {
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
    <div ref={ref} className="kartu-terang group relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl px-6 py-6 text-center transition-all sm:flex-row sm:gap-4 sm:text-left duration-300 ease-out hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-navy/20">
      {/* Garis warna di sisi atas kartu: melebar penuh saat kartu disorot */}
      <span
        aria-hidden
        className={`absolute inset-x-0 top-0 h-1 origin-left scale-x-[0.28] bg-gradient-to-r transition-transform duration-500 ease-out group-hover:scale-x-100 ${garis}`}
      />
      {/* Pendar warna di pojok yang menyala saat kartu disorot */}
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-transparent blur-2xl transition-colors duration-500 ${pendar}`}
      />
      <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 ${ikon}`}>
        <Icon className="h-5 w-5" />
      </div>

      <div className="relative">
        <p className="font-display text-4xl font-bold tabular-nums leading-none text-navy-dark">
          {displayValue.toLocaleString("id-ID")}
          {suffix}
        </p>
        <p className="mt-1.5 text-sm font-medium text-slate-500">{label}</p>
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
