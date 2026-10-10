"use client";

import { useEffect, useRef, useState } from "react";
import { IconUsers } from "@/components/icons";

// Penghitung pengunjung kecil di paling bawah beranda.
// `awal` = angka dari server saat halaman dimuat; null bila belum tersedia
// (mis. migrasi belum dijalankan) -> penghitung disembunyikan sama sekali.
//
// Begitu halaman terbuka di browser, kunjungan ini dicatat lewat
// /api/pengunjung (maks. sekali per hari per browser) dan angka diperbarui
// agar kunjungan ini ikut terhitung.

// Pemisah ribuan manual (titik), supaya hasil di server dan browser pasti sama.
const fmt = (n) => String(Math.max(0, Math.trunc(Number(n) || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export default function PengunjungBeranda({ awal }) {
  const [data, setData] = useState(awal);
  const sudahMencatat = useRef(false);

  useEffect(() => {
    if (!awal || sudahMencatat.current) return;
    sudahMencatat.current = true;
    // Peramban otomatis (webdriver) bukan pengunjung sungguhan.
    if (typeof navigator !== "undefined" && navigator.webdriver) return;

    let batal = false;
    (async () => {
      try {
        const res = await fetch("/api/pengunjung", {
          method: "POST",
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!res.ok) return;
        const j = await res.json();
        if (!batal && j?.ok && typeof j.total === "number") {
          setData({ total: j.total, hariIni: j.hariIni });
        }
      } catch {
        /* penghitung gagal -> abaikan, angka dari server tetap tampil */
      }
    })();
    return () => {
      batal = true;
    };
  }, [awal]);

  if (!data) return null;

  return (
    <p
      className="mt-2 inline-flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-[11px] text-slate-400"
      aria-label={`Jumlah pengunjung ${fmt(data.total)}, hari ini ${fmt(data.hariIni)}`}
    >
      <IconUsers className="h-3 w-3" aria-hidden="true" />
      <span>
        Pengunjung{" "}
        <span className="font-semibold tabular-nums text-slate-500">{fmt(data.total)}</span>
      </span>
      <span aria-hidden="true">·</span>
      <span>
        hari ini{" "}
        <span className="font-semibold tabular-nums text-slate-500">{fmt(data.hariIni)}</span>
      </span>
    </p>
  );
}
