"use client";

import { useEffect, useRef, useState } from "react";
import {
  IconBook,
  IconHeartHandshake,
  IconGenderBalance,
  IconCalendarRange,
  IconBriefcase,
  IconMapPin,
} from "@/components/icons";

const BELUM = "Belum Diisi";

// ---------------------------------------------------------------------------
// Helper kecil
// ---------------------------------------------------------------------------

const fmt = (n) => Number(n || 0).toLocaleString("id-ID");

function fmtPersen(n, total) {
  if (!total) return "0%";
  const p = (n / total) * 100;
  const teks = p > 0 && p < 10 ? p.toFixed(1) : p.toFixed(0);
  return `${teks.replace(".", ",")}%`;
}

// Baris "Belum Diisi" selalu ditaruh paling bawah supaya tidak mengganggu
// urutan utama, dan tidak pernah dihitung sebagai "terbanyak".
function urutkan(rows) {
  return [
    ...rows.filter((r) => r.label !== BELUM),
    ...rows.filter((r) => r.label === BELUM && r.jumlah > 0),
  ];
}

function terbesar(rows) {
  return rows
    .filter((r) => r.label !== BELUM && r.jumlah > 0)
    .reduce((a, b) => (!a || b.jumlah > a.jumlah ? b : a), null);
}

// Jalankan animasi hanya saat bagian ini benar-benar terlihat di layar.
function useInView() {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return [ref, inView];
}

function useCountUp(target, active, duration = 1100) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!active) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !target) {
      setVal(target || 0);
      return;
    }
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, active, duration]);

  return val;
}

// ---------------------------------------------------------------------------
// Donut jenis kelamin
// ---------------------------------------------------------------------------

const R = 54;
const C = 2 * Math.PI * R;

function Donut({ segmen, total, active }) {
  const angka = useCountUp(total, active);
  let mulai = 0;

  return (
    <div className="relative mx-auto h-52 w-52">
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90" role="img"
        aria-label={`Komposisi penduduk: ${segmen.map((s) => `${s.label} ${fmt(s.jumlah)}`).join(", ")}`}>
        <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="14" />
        {segmen.map((s) => {
          const frac = total > 0 ? s.jumlah / total : 0;
          const panjang = Math.max(frac * C - (segmen.length > 1 ? 3 : 0), 0);
          const offset = -mulai * C;
          mulai += frac;
          return (
            <circle
              key={s.label}
              cx="70"
              cy="70"
              r={R}
              fill="none"
              stroke={s.warna}
              strokeWidth="14"
              strokeLinecap="butt"
              strokeDasharray={`${active ? panjang : 0} ${C}`}
              strokeDashoffset={offset}
              className="transition-[stroke-dasharray] duration-[1200ms] ease-out motion-reduce:transition-none"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-4xl font-semibold tabular-nums text-white">
          {fmt(angka)}
        </span>
        <span className="mt-0.5 text-xs uppercase tracking-widest text-white/45">
          Penduduk
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Daftar batang (dipakai semua tab)
// ---------------------------------------------------------------------------

function DaftarBatang({ rows, active }) {
  const [tumbuh, setTumbuh] = useState(false);

  // Komponen ini di-remount tiap ganti tab (lewat key), jadi batang selalu
  // "tumbuh" dari 0 lagi -- kecil tapi memberi umpan balik jelas.
  useEffect(() => {
    const id = requestAnimationFrame(() => setTumbuh(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const total = rows.reduce((s, r) => s + r.jumlah, 0);
  const maks = Math.max(...rows.map((r) => r.jumlah), 1);
  const juara = terbesar(rows);

  return (
    <ul className="space-y-4">
      {rows.map((r) => {
        const belum = r.label === BELUM;
        const unggul = juara && r.label === juara.label;
        const lebar = tumbuh && active ? Math.max((r.jumlah / maks) * 100, r.jumlah > 0 ? 2 : 0) : 0;
        return (
          <li key={r.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span
                className={`truncate text-sm ${belum ? "text-white/40" : unggul ? "font-medium text-white" : "text-white/75"}`}
                title={r.label}
              >
                {r.label}
              </span>
              <span className="shrink-0 whitespace-nowrap tabular-nums">
                <span className={`text-sm font-semibold ${belum ? "text-white/50" : "text-white"}`}>
                  {fmt(r.jumlah)}
                </span>
                <span className="ml-2 inline-block w-10 text-right text-xs text-white/40">
                  {fmtPersen(r.jumlah, total)}
                </span>
              </span>
            </div>
            {r.sub && <p className="mt-0.5 text-[11px] text-white/35">{r.sub}</p>}
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none ${
                  belum
                    ? "bg-white/25"
                    : unggul
                    ? "bg-gradient-to-r from-gold to-gold-light"
                    : "bg-gradient-to-r from-seablue/80 to-seablue/50"
                }`}
                style={{ width: `${lebar}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Komponen utama
// ---------------------------------------------------------------------------

export default function StatistikDetailBeranda({ detail, perDusun = [] }) {
  const {
    perAgama = [],
    perStatusKawin = [],
    perJenisKelamin = [],
    perRentangUsia = [],
    perPekerjaan = [],
  } = detail || {};

  const [ref, inView] = useInView();
  const [tabAktif, setTabAktif] = useState("usia");

  const kosong =
    perAgama.length === 0 &&
    perStatusKawin.length === 0 &&
    perJenisKelamin.length === 0 &&
    perRentangUsia.length === 0 &&
    perPekerjaan.length === 0;

  if (kosong) return null;

  // --- Jenis kelamin ---------------------------------------------------
  const laki = perJenisKelamin.find((r) => r.label === "Laki-laki")?.jumlah || 0;
  const perempuan = perJenisKelamin.find((r) => r.label === "Perempuan")?.jumlah || 0;
  const belumJk = perJenisKelamin.find((r) => r.label === BELUM)?.jumlah || 0;
  const totalPenduduk = laki + perempuan + belumJk;

  const segmen = [
    { label: "Laki-laki", jumlah: laki, warna: "#3FA9F5" },
    { label: "Perempuan", jumlah: perempuan, warna: "#E8B933" },
    ...(belumJk > 0 ? [{ label: BELUM, jumlah: belumJk, warna: "rgba(255,255,255,0.3)" }] : []),
  ];
  const rasio = perempuan > 0 ? Math.round((laki / perempuan) * 100) : null;

  // --- Tab -------------------------------------------------------------
  const rowsDusun = perDusun.map((d) => ({
    label: d.label,
    jumlah: d.jumlah,
    sub: d.label === BELUM ? undefined : `Laki-laki ${fmt(d.laki)} · Perempuan ${fmt(d.perempuan)}`,
  }));

  const TAB = [
    { id: "usia", nama: "Usia", icon: IconCalendarRange, judul: "Kelompok usia", ket: "Jumlah penduduk menurut rentang umur", rows: urutkan(perRentangUsia) },
    { id: "pekerjaan", nama: "Pekerjaan", icon: IconBriefcase, judul: "Pekerjaan", ket: "8 pekerjaan terbanyak, sisanya digabung di “Lainnya”", rows: urutkan(perPekerjaan) },
    { id: "agama", nama: "Agama", icon: IconBook, judul: "Agama", ket: "Jumlah penduduk menurut agama", rows: urutkan(perAgama) },
    { id: "nikah", nama: "Status Nikah", icon: IconHeartHandshake, judul: "Status pernikahan", ket: "Kawin, belum kawin, cerai hidup, cerai mati", rows: urutkan(perStatusKawin) },
    ...(rowsDusun.length > 1
      ? [{ id: "dusun", nama: "Per Dusun", icon: IconMapPin, judul: "Sebaran per dusun", ket: "Jumlah penduduk di tiap dusun", rows: urutkan(rowsDusun) }]
      : []),
  ].filter((t) => t.rows.length > 0);

  const tab = TAB.find((t) => t.id === tabAktif) || TAB[0];

  // --- Sekilas (4 fakta utama, bisa diklik untuk membuka rinciannya) -----
  const sekilas = [
    { tab: "usia", label: "Usia terbanyak", juara: terbesar(TAB.find((t) => t.id === "usia")?.rows || []) },
    { tab: "pekerjaan", label: "Pekerjaan terbanyak", juara: terbesar(TAB.find((t) => t.id === "pekerjaan")?.rows || []) },
    { tab: "agama", label: "Agama mayoritas", juara: terbesar(TAB.find((t) => t.id === "agama")?.rows || []) },
    TAB.find((t) => t.id === "dusun")
      ? { tab: "dusun", label: "Dusun terpadat", juara: terbesar(TAB.find((t) => t.id === "dusun").rows) }
      : { tab: "nikah", label: "Status terbanyak", juara: terbesar(TAB.find((t) => t.id === "nikah")?.rows || []) },
  ].filter((s) => s.juara);

  return (
    <section ref={ref} className="relative overflow-hidden bg-navy-dark py-16 md:py-24">
      {/* Cahaya lembut latar */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_85%_0%,rgba(63,169,245,0.16),transparent),radial-gradient(45%_40%_at_5%_100%,rgba(232,185,51,0.10),transparent)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-6">
        {/* Judul */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-gold">Data Terbuka</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-white sm:text-4xl">
              Desa Dalam Angka
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/60">
              Gambaran penduduk desa yang dirangkum otomatis dari data
              kependudukan. Hanya angka agregat yang ditampilkan — tidak ada
              data pribadi warga yang dibuka ke publik.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/60">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Diperbarui otomatis dari database
          </span>
        </div>

        {/* Sekilas */}
        {sekilas.length > 0 && (
          <div className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {sekilas.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => setTabAktif(s.tab)}
                className="group rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition duration-300 hover:-translate-y-0.5 hover:border-gold/40 hover:bg-white/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
              >
                <p className="text-[11px] uppercase tracking-widest text-white/45">{s.label}</p>
                <p className="mt-2 truncate font-display text-lg font-semibold text-white sm:text-xl" title={s.juara.label}>
                  {s.juara.label}
                </p>
                <p className="mt-1 text-xs text-gold-light">
                  {fmt(s.juara.jumlah)} orang · {fmtPersen(s.juara.jumlah, totalPenduduk)}
                </p>
              </button>
            ))}
          </div>
        )}

        {/* Donut + Rincian */}
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {/* Jenis kelamin */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-gold-light">
                <IconGenderBalance className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-semibold text-white">Jenis Kelamin</h3>
                <p className="text-xs text-white/45">Perbandingan laki-laki dan perempuan</p>
              </div>
            </div>

            <div className="mt-6">
              <Donut segmen={segmen} total={totalPenduduk} active={inView} />
            </div>

            <ul className="mt-6 space-y-3">
              {segmen.map((s) => (
                <li key={s.label} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2.5 text-white/75">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.warna }} />
                    {s.label}
                  </span>
                  <span className="tabular-nums">
                    <span className="font-semibold text-white">{fmt(s.jumlah)}</span>
                    <span className="ml-2 text-xs text-white/40">{fmtPersen(s.jumlah, totalPenduduk)}</span>
                  </span>
                </li>
              ))}
            </ul>

            {rasio && (
              <p className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs leading-relaxed text-white/55">
                Rasio jenis kelamin{" "}
                <span className="font-semibold text-gold-light">{rasio}</span>: ada {rasio} laki-laki untuk setiap 100 perempuan.
              </p>
            )}
          </div>

          {/* Rincian bertab */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur sm:p-8">
            <div
              role="tablist"
              aria-label="Kategori statistik"
              className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {TAB.map((t) => {
                const aktif = t.id === tab.id;
                return (
                  <button
                    key={t.id}
                    role="tab"
                    type="button"
                    aria-selected={aktif}
                    aria-controls="panel-statistik"
                    onClick={() => setTabAktif(t.id)}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 ${
                      aktif
                        ? "bg-gold text-navy-dark shadow-[0_0_24px_-6px] shadow-gold/60"
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <t.icon className="h-4 w-4" />
                    {t.nama}
                  </button>
                );
              })}
            </div>

            <div id="panel-statistik" role="tabpanel" className="mt-6">
              <h3 className="font-display text-xl font-semibold text-white">{tab.judul}</h3>
              <p className="mt-1 text-xs text-white/45">{tab.ket}</p>
              <div className="mt-6">
                <DaftarBatang key={tab.id} rows={tab.rows} active={inView} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
