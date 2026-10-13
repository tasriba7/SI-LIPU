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
    <div ref={ref} className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-white/60 bg-gradient-to-br from-white/80 to-white/50 py-2.5 pl-4 pr-3 shadow-lg shadow-black/10 backdrop-blur-md backdrop-saturate-150 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:from-white/90 hover:to-white/65 hover:shadow-xl hover:shadow-black/20">
      {/* Kilau tipis di tepi atas: kesan kaca yang terkena cahaya */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent"
      />
      {/* Aksen warna di sisi kiri kartu: memanjang penuh saat kartu disorot */}
      <span
        aria-hidden
        className={`absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b transition-all duration-500 ease-out group-hover:h-full ${garis}`}
      />
      {/* Pendar warna di pojok yang menyala saat kartu disorot */}
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-transparent blur-2xl transition-colors duration-500 ${pendar}`}
      />
      {/* Ikon besar samar sebagai hiasan di sudut kanan */}
      <Icon
        aria-hidden
        className="pointer-events-none absolute -bottom-2 -right-1 h-12 w-12 -rotate-12 text-navy-dark/[0.07] transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110"
      />
      <div className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-md ring-2 ring-white/70 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 ${ikon}`}>
        <Icon className="h-4 w-4" />
      </div>

      <div className="relative min-w-0">
        <p className="font-display text-2xl font-bold tabular-nums leading-none text-navy-dark">
          {displayValue.toLocaleString("id-ID")}
          {suffix}
        </p>
        <p className="mt-0.5 text-xs font-medium leading-tight text-navy-dark/65">{label}</p>
      </div>
    </div>
  );
}

export default function StatBerandaCards({ stats }) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
      {STAT_CARDS.map((c, i) => (
        <Reveal key={c.key} delay={i * 130} variant="up" className="h-full">
          <StatCard {...c} value={stats[c.key]} />
        </Reveal>
      ))}
    </div>
  );
}
