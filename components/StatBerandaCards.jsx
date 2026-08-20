"use client";

import { useEffect, useRef, useState } from "react";
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
    accent: "from-seablue via-gold to-seablue",
  },
  {
    key: "totalKepalaKeluarga",
    label: "Jumlah Kepala Keluarga",
    icon: IconIdCard,
    accent: "from-gold via-gold-light to-gold",
  },
  {
    key: "totalAjuanDiproses",
    label: "Ajuan Sudah Diproses",
    icon: IconClipboardCheck,
    accent: "from-emerald-400 via-gold to-emerald-400",
  },
];

// Satu kartu statistik: nomor animasi count-up + efek "tilt & spotlight"
// yang mengikuti posisi kursor, jadi terasa hidup saat kursor diarahkan
// ke kartu tanpa perlu library animasi eksternal.
function StatCard({ icon: Icon, label, value, suffix = "", accent }) {
  const cardRef = useRef(null);
  const [displayValue, setDisplayValue] = useState(0);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, mx: 50, my: 50, hover: false });

  // Animasi count-up dari 0 ke nilai asli, dengan easing supaya tidak
  // terasa kaku/linear.
  useEffect(() => {
    const target = Number(value) || 0;
    if (target === 0) {
      setDisplayValue(0);
      return;
    }
    const duration = 1200;
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
  }, [value]);

  function handleMouseMove(e) {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0..1
    const py = (e.clientY - rect.top) / rect.height; // 0..1

    const maxTilt = 10; // derajat
    setTilt({
      rx: (0.5 - py) * maxTilt,
      ry: (px - 0.5) * maxTilt,
      mx: px * 100,
      my: py * 100,
      hover: true,
    });
  }

  function handleMouseLeave() {
    setTilt((t) => ({ ...t, rx: 0, ry: 0, hover: false }));
  }

  return (
    <div style={{ perspective: "1000px" }}>
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: `scale(${tilt.hover ? 1.06 : 1}) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
          transformStyle: "preserve-3d",
        }}
        className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-navy-light/60 via-navy to-navy-dark p-6 shadow-lg shadow-navy-dark/30 transition-transform duration-300 ease-out will-change-transform"
      >
        {/* Spotlight yang mengikuti kursor */}
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `radial-gradient(220px circle at ${tilt.mx}% ${tilt.my}%, rgba(232,185,51,0.25), transparent 70%)`,
          }}
        />

        {/* Watermark ikon raksasa di belakang */}
        <Icon className="pointer-events-none absolute -bottom-4 -right-4 h-28 w-28 text-white/[0.06] transition-transform duration-300 group-hover:scale-110 group-hover:text-gold/10" />

        {/* Garis aksen atas */}
        <div
          className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${accent} opacity-70 transition-opacity duration-300 group-hover:opacity-100`}
        />

        <div className="relative" style={{ transform: "translateZ(30px)" }}>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-gold-light transition-colors duration-300 group-hover:bg-gold/20">
            <Icon className="h-5 w-5" />
          </div>

          <p className="mt-5 font-display text-4xl font-semibold tabular-nums text-white sm:text-[2.75rem]">
            {displayValue.toLocaleString("id-ID")}
            {suffix}
          </p>
          <p className="mt-1.5 text-sm font-medium text-white/60">{label}</p>
        </div>
      </div>
    </div>
  );
}

export default function StatBerandaCards({ stats }) {
  return (
    <div className="grid gap-5 sm:grid-cols-3">
      {STAT_CARDS.map((c) => (
        <StatCard key={c.key} {...c} value={stats[c.key]} />
      ))}
    </div>
  );
}
