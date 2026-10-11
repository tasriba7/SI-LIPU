"use client";

import { useEffect, useState } from "react";
import { IconCalendarRange } from "@/components/icons";
import { formatWaktuBeranda } from "@/lib/waktuLokal";

// Satu angka yang "naik" ala odometer: saat nilainya berubah, angka lama
// bergeser keluar ke atas sementara angka baru masuk dari bawah.
// Semua digit memakai lebar tetap (1ch, font mono) sehingga tidak bergoyang.
function AngkaNaik({ nilai }) {
  const [s, setS] = useState({ sekarang: nilai, sebelum: null, n: 0 });
  // Pola "turunan dari props": simpan angka lama selama animasi berjalan.
  if (s.sekarang !== nilai) {
    setS({ sekarang: nilai, sebelum: s.sekarang, n: s.n + 1 });
  }
  return (
    <span className="relative inline-block h-[1.25em] w-[1ch] overflow-hidden align-middle leading-[1.25em]">
      {s.sebelum !== null && (
        <span
          key={`lama-${s.n}`}
          aria-hidden="true"
          className="absolute inset-x-0 top-0 block animate-naikKeluar text-center motion-reduce:hidden"
          onAnimationEnd={() => setS((x) => ({ ...x, sebelum: null }))}
        >
          {s.sebelum}
        </span>
      )}
      <span
        key={`baru-${s.n}`}
        className="block animate-naikMasuk text-center motion-reduce:animate-none"
      >
        {s.sekarang}
      </span>
    </span>
  );
}

function DuaAngka({ teks }) {
  return (
    <>
      <AngkaNaik nilai={teks[0]} />
      <AngkaNaik nilai={teks[1]} />
    </>
  );
}

// Hari, tanggal, dan jam (sampai detik) dalam satu kapsul kecil — dipasang di
// dalam hero beranda, tepat di atas baris "Desa · Kec. …". Waktu mengikuti
// zona waktu perangkat pengunjung.
//
// Di server waktu belum diketahui (zona server ≠ zona warga), jadi awalnya
// hanya kerangka dengan ukuran tetap; begitu dimuat di browser, waktu terisi
// tanpa membuat halaman bergeser.
export default function JamTanggalBeranda() {
  const [w, setW] = useState(null);

  useEffect(() => {
    let timer;
    const perbarui = () => setW(formatWaktuBeranda(new Date()));
    // Tiap tick dijadwalkan tepat di pergantian detik berikutnya, supaya
    // detik tidak tertinggal/loncat seperti setInterval biasa.
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
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[13px] text-white/85 sm:text-sm lg:justify-start">
      <p>
        <span className="sm:hidden">{w ? `${w.hariPendek}, ${w.tanggalPendek}` : "···"}</span>
        <span className="hidden sm:inline">{w ? `${w.hari}, ${w.tanggal}` : "······"}</span>
      </p>
      <span className="h-3.5 w-px bg-white/30" aria-hidden="true" />
      {/* Jam sampai detik: disembunyikan dari pembaca layar karena berubah tiap detik. */}
      <p aria-hidden="true" className="font-mono tabular-nums">
        {w ? (
          <>
            <DuaAngka teks={w.jam} />:<DuaAngka teks={w.menit} />:<DuaAngka teks={w.detik} />{" "}
            <span className="text-white/60">{w.zona}</span>
          </>
        ) : (
          "––:––:––"
        )}
      </p>
      {w && (
        <span className="sr-only">
          Pukul {w.jam}.{w.menit} {w.zona}
        </span>
      )}
    </div>
  );
}
