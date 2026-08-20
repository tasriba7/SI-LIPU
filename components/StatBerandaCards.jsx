"use client";

import { useEffect, useState } from "react";
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

  // Animasi count-up dari 0 ke nilai asli, dengan easing supaya tidak
  // terasa kaku/linear.
  useEffect(() => {
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
  }, [value]);

  return (
    <div className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-5 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-gold/40 hover:bg-white/[0.05]">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5 text-gold-light transition-colors duration-300 group-hover:bg-gold/15">
        <Icon className="h-5 w-5" />
      </div>

      <div>
        <p className="font-display text-3xl font-semibold tabular-nums text-white">
          {displayValue.toLocaleString("id-ID")}
          {suffix}
        </p>
        <p className="mt-0.5 text-sm text-white/50">{label}</p>
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
