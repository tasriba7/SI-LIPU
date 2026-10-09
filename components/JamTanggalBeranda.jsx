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
    <div className="mb-4 flex justify-center md:mb-5">
      <div className="inline-flex h-9 max-w-full items-center gap-2.5 whitespace-nowrap rounded-full bg-navy-dark/85 px-3.5 shadow-lg shadow-black/25 ring-1 ring-gold/50 backdrop-blur-sm sm:h-11 sm:gap-3.5 sm:px-5">
        <IconCalendarRange className="hidden h-4 w-4 shrink-0 text-gold-light sm:block" />

        {/* Hari & tanggal — di HP memakai singkatan agar muat satu baris. */}
        <p className="text-[12px] font-medium text-white sm:text-[14px]">
          <span className="text-gold-light">
            <span className="sm:hidden">{w ? w.hariPendek : "···"}</span>
            <span className="hidden sm:inline">{w ? w.hari : "······"}</span>,
          </span>{" "}
          <span className="sm:hidden">{w ? w.tanggalPendek : "·· ··· ····"}</span>
          <span className="hidden sm:inline">{w ? w.tanggal : "·· ······· ····"}</span>
        </p>

        <span className="h-4 w-px shrink-0 bg-white/25 sm:h-5" aria-hidden="true" />

        {/* Jam sampai detik. Disembunyikan dari pembaca layar karena berubah
            tiap detik; yang dibacakan hanya jam & menit lewat teks sr-only. */}
        <p
          aria-hidden="true"
          className="font-mono text-[17px] font-semibold leading-none tracking-wide text-white sm:text-[21px]"
        >
          {w ? (
            <>
              <DuaAngka teks={w.jam} />
              <span className="mx-px text-gold">:</span>
              <DuaAngka teks={w.menit} />
              <span className="mx-px text-gold">:</span>
              <span className="text-gold-light">
                <DuaAngka teks={w.detik} />
              </span>
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

        <span className="rounded-md bg-gold/15 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-widest text-gold-light ring-1 ring-gold/30 sm:text-[10px]">
          {w ? w.zona : "···"}
        </span>
      </div>
    </div>
  );
}
