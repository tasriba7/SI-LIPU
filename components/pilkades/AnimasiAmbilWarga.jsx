"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animasi layar penuh "Mengambil data warga".
 *
 * Kenapa terpisah dari tombol: begitu data tiba, halaman berganti tampilan
 * (tombol lama hilang) dan halaman bisa dimuat ulang setelah redirect. Kalau
 * animasi menempel di tombol, ia ikut hilang seketika. Di sini waktu mulai
 * disimpan di sessionStorage, jadi animasi tetap berjalan sampai batas
 * minimal terpenuhi, lalu menutup sendiri.
 */
export const EVENT_AMBIL_WARGA = "ambil-warga-mulai";
const KUNCI = "ambilWargaMulai";
const MIN_MS = 5000; // animasi tampil minimal selama ini
const MAKS_MS = 60000; // pengaman: tutup paksa bila server tak kunjung menjawab
const JEDA_AKHIR_MS = 600; // tahan sebentar di 100% supaya terlihat selesai

const TAHAP = [
  "Menghubungkan ke data penduduk…",
  "Membaca data warga desa…",
  "Memeriksa usia dan status warga…",
  "Menyalin ke daftar calon pemilih…",
  "Menyamakan dengan data penduduk…",
  "Hampir selesai…",
  "Selesai ✓",
];

const bacaMulai = () => {
  try {
    const n = Number(sessionStorage.getItem(KUNCI));
    return n && Date.now() - n < MAKS_MS ? n : 0;
  } catch {
    return 0;
  }
};
const simpanMulai = (n) => {
  try {
    if (n) sessionStorage.setItem(KUNCI, String(n));
    else sessionStorage.removeItem(KUNCI);
  } catch {
    /* abaikan */
  }
};

export default function AnimasiAmbilWarga({ renderId }) {
  const [tampil, setTampil] = useState(false);
  const [persen, setPersen] = useState(0);
  const mulai = useRef(0);
  const tiba = useRef(false); // true = server sudah menjawab
  const idAwal = useRef(null);
  const idTerbaru = useRef(renderId);
  const penuhPada = useRef(0);
  idTerbaru.current = renderId;

  // Mulai: dari klik tombol, atau lanjut setelah halaman dimuat ulang (redirect).
  useEffect(() => {
    const awal = bacaMulai();
    if (awal) {
      mulai.current = awal;
      tiba.current = true; // halaman baru terbuka = data sudah tiba
      penuhPada.current = 0;
      setTampil(true);
    }
    const saatKlik = () => {
      mulai.current = Date.now();
      simpanMulai(mulai.current);
      idAwal.current = idTerbaru.current;
      tiba.current = false;
      penuhPada.current = 0;
      setPersen(2);
      setTampil(true);
    };
    window.addEventListener(EVENT_AMBIL_WARGA, saatKlik);
    return () => window.removeEventListener(EVENT_AMBIL_WARGA, saatKlik);
  }, []);

  // Halaman dirender ulang oleh server setelah klik = data sudah tiba.
  useEffect(() => {
    if (tampil && idAwal.current !== null && renderId !== idAwal.current) tiba.current = true;
  }, [renderId, tampil]);

  // Pengatur progres + penutup.
  useEffect(() => {
    if (!tampil) return undefined;
    const lama = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setInterval(() => {
      const lalu = Date.now() - mulai.current;
      let p;
      if (tiba.current) {
        p = lalu >= MIN_MS ? 100 : Math.max((lalu / MIN_MS) * 100, 2);
      } else if (lalu <= MIN_MS) {
        p = (lalu / MIN_MS) * 90;
      } else {
        p = 90 + (1 - Math.exp(-(lalu - MIN_MS) / 8000)) * 8; // menunggu server, maks 98%
      }
      setPersen(p);
      const selesai = (tiba.current && lalu >= MIN_MS) || lalu >= MAKS_MS;
      if (selesai) {
        if (!penuhPada.current) penuhPada.current = Date.now();
        if (Date.now() - penuhPada.current >= JEDA_AKHIR_MS) {
          simpanMulai(0);
          setTampil(false);
        }
      }
    }, 100);
    return () => {
      clearInterval(t);
      document.body.style.overflow = lama;
    };
  }, [tampil]);

  if (!tampil) return null;
  const tahap = persen >= 100 ? TAHAP.length - 1 : Math.min(Math.floor((persen / 100) * (TAHAP.length - 1)), TAHAP.length - 2);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-live="polite"
      aria-label="Sedang mengambil data warga"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-sky-950/80 p-4 backdrop-blur-sm"
    >
      <style>{`
        @keyframes alirWarga { 0% { transform: translateX(-120px) scale(.6); opacity: 0 }
          15% { opacity: 1 } 70% { opacity: 1 } 100% { transform: translateX(120px) scale(.4); opacity: 0 } }
        @keyframes denyutCincin { 0% { transform: scale(.7); opacity: .6 } 100% { transform: scale(1.7); opacity: 0 } }
        @keyframes kilatBar { 0% { transform: translateX(-100%) } 100% { transform: translateX(300%) } }
        @keyframes muncul { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
        @keyframes titikLompat { 0%,80%,100% { transform: translateY(0); opacity: .4 } 40% { transform: translateY(-5px); opacity: 1 } }
        @media (prefers-reduced-motion: reduce) {
          .anim-ambil, .anim-ambil * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; }
        }
      `}</style>

      <div className="anim-ambil w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl ring-1 ring-sky-200">
        <div className="relative mx-auto flex h-28 w-full items-center justify-between overflow-hidden px-4">
          <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-sky-100 text-sky-700">
            <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <circle cx="9" cy="8" r="3" />
              <path strokeLinecap="round" d="M3 19c0-3.3 2.7-6 6-6s6 2.7 6 6" />
              <circle cx="17" cy="9" r="2.3" />
              <path strokeLinecap="round" d="M16 13.2c2.8.2 5 2.3 5 5.3" />
            </svg>
          </div>

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {[0, 0.45, 0.9, 1.35].map((d, i) => (
              <span
                key={i}
                className="absolute h-5 w-7 rounded-md border border-sky-300 bg-gradient-to-br from-sky-400 to-sky-600 shadow"
                style={{ animation: `alirWarga 1.8s ${d}s ease-in-out infinite`, top: `${38 + (i % 2) * 14}%` }}
              >
                <span className="absolute left-1 top-1 h-1.5 w-1.5 rounded-full bg-white/80" />
                <span className="absolute bottom-1 left-1 right-1 h-0.5 rounded bg-white/70" />
              </span>
            ))}
          </div>

          <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <span className="absolute inset-0 rounded-full border-2 border-emerald-400" style={{ animation: "denyutCincin 1.6s ease-out infinite" }} />
            <span className="absolute inset-0 rounded-full border-2 border-emerald-400" style={{ animation: "denyutCincin 1.6s .8s ease-out infinite" }} />
            <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <ellipse cx="12" cy="6" rx="7" ry="3" />
              <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
              <path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
            </svg>
          </div>
        </div>

        <h2 className="mt-3 text-lg font-bold text-sky-950">Mengambil data warga</h2>
        <p key={tahap} className="mt-1 min-h-[1.5rem] text-sm text-slate-700" style={{ animation: "muncul .4s ease" }}>
          {TAHAP[tahap]}
        </p>

        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-sky-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(persen)}>
          <div className="relative h-full overflow-hidden rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-[width] duration-200 ease-linear" style={{ width: `${persen}%` }}>
            <span className="absolute inset-y-0 left-0 w-1/3 bg-white/40" style={{ animation: "kilatBar 1.3s linear infinite" }} />
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs font-semibold text-sky-800">
          <span className="flex items-center gap-1">
            Mohon tunggu
            {[0, 0.15, 0.3].map((d) => (
              <span key={d} className="inline-block h-1 w-1 rounded-full bg-sky-700" style={{ animation: `titikLompat 1s ${d}s infinite` }} />
            ))}
          </span>
          <span>{Math.round(persen)}%</span>
        </div>
        <p className="mt-3 text-xs text-slate-500">Jangan tutup atau muat ulang halaman ini.</p>
      </div>
    </div>
  );
}
