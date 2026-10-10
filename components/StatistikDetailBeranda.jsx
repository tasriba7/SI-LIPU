"use client";

import { useEffect, useRef, useState } from "react";
import { eksporExcel, eksporPdf } from "@/lib/eksporStatistik";
import { cariLansia, KELOMPOK_LANSIA, BATAS_LANSIA } from "@/lib/lansia";
import { cariBalita, KELOMPOK_BALITA, BATAS_BALITA } from "@/lib/balita";
import {
  IconBook,
  IconHeartHandshake,
  IconGenderBalance,
  IconCalendarRange,
  IconBriefcase,
  IconMapPin,
  IconLansia,
  IconBalita,
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

// "Lainnya" (gabungan pekerjaan di luar 8 teratas) bukan kategori nyata,
// jadi tidak pernah disebut "terbanyak" (sama seperti di dashboard admin).
function terbesar(rows) {
  return rows
    .filter((r) => r.label !== BELUM && r.label !== "Lainnya" && r.jumlah > 0)
    .reduce((a, b) => (!a || b.jumlah > a.jumlah ? b : a), null);
}

// Animasi diagram hanya berjalan saat diagramnya SENDIRI terlihat di layar
// (bukan saat seksi statistik yang panjang ini mulai terlihat). Sebelum itu
// diagram tetap diam di keadaan awal (kosong). Setiap `resetKey` berubah
// (mis. ganti kategori), animasi disiapkan ulang dan baru berjalan begitu
// diagramnya terlihat — langsung bila sudah terlihat, atau nanti saat
// digulir ke sana bila belum.
function useTampilDiLayar(resetKey, ambang = 0.3) {
  const ref = useRef(null);
  const [tampil, setTampil] = useState(false);

  useEffect(() => {
    setTampil(false);
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setTampil(true);
      return;
    }
    let f1;
    let f2;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        // Dua frame: pastikan keadaan awal (kosong) sempat tergambar dulu,
        // supaya transisinya benar-benar terlihat berjalan.
        f1 = requestAnimationFrame(() => {
          f2 = requestAnimationFrame(() => setTampil(true));
        });
      },
      { threshold: ambang }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(f1);
      cancelAnimationFrame(f2);
    };
  }, [resetKey, ambang]);

  return [ref, tampil];
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

// Warna irisan donut untuk kategori selain jenis kelamin. Teal & ungu
// dicadangkan untuk balita & lansia (sama seperti batang dan kartu di atas).
const WARNA_IRISAN = [
  "#3FA9F5", "#E8B933", "#FB7185", "#F97316",
  "#84CC16", "#E879F9", "#22D3EE", "#818CF8",
];

function segmenDariBaris(rows) {
  let i = 0;
  return rows
    .filter((r) => r.jumlah > 0)
    .map((r) => {
      let warna;
      if (r.label === BELUM) warna = "rgba(255,255,255,0.3)";
      else if (r.label === "Lainnya") warna = "#94A3B8";
      else if (r.sorot === "balita") warna = "#2DD4BF";
      else if (r.sorot) warna = "#A78BFA";
      else warna = WARNA_IRISAN[i++ % WARNA_IRISAN.length];
      return { label: r.label, jumlah: r.jumlah, warna };
    });
}

// `kunci` = kategori yang sedang ditampilkan. Angka tengah (total penduduk)
// hanya menghitung naik sekali, saat pertama kali terlihat; irisan donut
// menggambar ulang setiap kategori berganti — dan hanya bila donutnya terlihat.
function Donut({ segmen, angkaTengah, labelTengah, kunci, deskripsi }) {
  const [ref, tampil] = useTampilDiLayar(kunci, 0.4);
  const [pernah, setPernah] = useState(false);
  useEffect(() => {
    if (tampil) setPernah(true);
  }, [tampil]);
  const angka = useCountUp(angkaTengah, pernah);

  const total = segmen.reduce((s, x) => s + x.jumlah, 0);
  let mulai = 0;

  return (
    <div ref={ref} className="relative mx-auto h-52 w-52">
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90" role="img" aria-label={deskripsi}>
        <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="14" />
        <g key={kunci}>
          {segmen.map((s) => {
            const frac = total > 0 ? s.jumlah / total : 0;
            // Celah antar irisan 3 satuan, tetapi irisan sangat kecil (mis. 0,4%)
            // tidak boleh habis terpotong celah: celahnya dikecilkan supaya
            // tetap tampak sebagai garis tipis.
            const celah = segmen.length > 1 ? Math.min(3, frac * C * 0.4) : 0;
            const panjang = Math.max(frac * C - celah, 0);
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
                strokeDasharray={`${tampil ? panjang : 0} ${C}`}
                strokeDashoffset={offset}
                className="transition-[stroke-dasharray] duration-[1200ms] ease-out motion-reduce:transition-none"
              />
            );
          })}
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
        <span className="font-display text-4xl font-semibold tabular-nums text-white">
          {fmt(angka)}
        </span>
        <span className="mt-0.5 max-w-full truncate text-xs uppercase tracking-widest text-white/45">
          {labelTengah}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Daftar batang (dipakai semua tab)
// ---------------------------------------------------------------------------

function DaftarBatang({ rows }) {
  // Komponen ini di-remount tiap ganti tab (lewat key), jadi batang selalu
  // "tumbuh" dari 0 lagi — tetapi hanya begitu daftarnya terlihat di layar.
  const [ref, tampil] = useTampilDiLayar("batang", 0.2);

  const total = rows.reduce((s, r) => s + r.jumlah, 0);
  const maks = Math.max(...rows.map((r) => r.jumlah), 1);
  const juara = terbesar(rows);

  return (
    <ul ref={ref} className="space-y-4">
      {rows.map((r) => {
        const belum = r.label === BELUM;
        const unggul = juara && r.label === juara.label;
        const sorot = !!r.sorot;
        const lebar = tampil ? Math.max((r.jumlah / maks) * 100, r.jumlah > 0 ? 2 : 0) : 0;
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
                    : sorot === "balita"
                    ? "bg-gradient-to-r from-teal-400 to-teal-300"
                    : sorot
                    ? "bg-gradient-to-r from-violet-400 to-violet-300"
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

function TombolUnduh({ detail, perDusun, namaDesa, wilayah }) {
  const [proses, setProses] = useState(null);
  const [galat, setGalat] = useState(false);

  async function jalankan(jenis) {
    setProses(jenis);
    setGalat(false);
    try {
      const args = { detail, perDusun, namaDesa, wilayah };
      await (jenis === "pdf" ? eksporPdf(args) : eksporExcel(args));
    } catch (e) {
      console.error(e);
      setGalat(true);
    } finally {
      setProses(null);
    }
  }

  const kelas =
    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 disabled:cursor-wait disabled:opacity-60";
  const ikon = (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
    </svg>
  );

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
      <button type="button" disabled={!!proses} onClick={() => jalankan("pdf")}
        className={`${kelas} border-gold bg-gold text-navy-dark hover:bg-gold-light`}>
        {ikon}{proses === "pdf" ? "Menyiapkan…" : "Unduh PDF"}
      </button>
      <button type="button" disabled={!!proses} onClick={() => jalankan("xlsx")}
        className={`${kelas} border-white/20 bg-white/[0.06] text-white hover:bg-white/10`}>
        {ikon}{proses === "xlsx" ? "Menyiapkan…" : "Unduh Excel"}
      </button>
      {galat && <span className="text-xs text-red-300">Gagal membuat berkas, coba lagi.</span>}
    </div>
  );
}

export default function StatistikDetailBeranda({ detail, perDusun = [], namaDesa = "", wilayah = "" }) {
  const {
    perAgama = [],
    perStatusKawin = [],
    perJenisKelamin = [],
    perRentangUsia = [],
    perPekerjaan = [],
  } = detail || {};

  const [tabAktif, setTabAktif] = useState("usia");
  // Kategori yang sedang digambar di donut. null = jenis kelamin (penduduk),
  // tampilan awal; berubah begitu pengunjung memilih tab/kartu kategori.
  const [donutId, setDonutId] = useState(null);
  const pilihTab = (id) => {
    setTabAktif(id);
    setDonutId(id);
  };

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
  const lansia = cariLansia(perRentangUsia);
  const balita = cariBalita(perRentangUsia);
  const jumlahKartuKhusus = (lansia.tersedia ? 1 : 0) + (balita.tersedia ? 1 : 0);
  const kolomSekilas = { 0: "lg:grid-cols-4", 1: "lg:grid-cols-5", 2: "lg:grid-cols-6" }[jumlahKartuKhusus];
  // Satu kartu khusus saja -> penuh selebar baris di ponsel; dua -> berdampingan.
  const spanKhusus = jumlahKartuKhusus === 1 ? "col-span-2 lg:col-span-1" : "col-span-1";
  const rasio = perempuan > 0 ? Math.round((laki / perempuan) * 100) : null;

  // --- Tab -------------------------------------------------------------
  const rowsDusun = perDusun.map((d) => ({
    label: d.label,
    jumlah: d.jumlah,
    sub: d.label === BELUM ? undefined : `Laki-laki ${fmt(d.laki)} · Perempuan ${fmt(d.perempuan)}`,
  }));

  const TAB = [
    { id: "usia", nama: "Usia", icon: IconCalendarRange, judul: "Kelompok usia", ket: "Jumlah penduduk menurut rentang umur", rows: urutkan(
        perRentangUsia.map((r) =>
          r.label === KELOMPOK_LANSIA
            ? { ...r, sub: `Lansia, usia ${BATAS_LANSIA} tahun ke atas`, sorot: true }
            : r.label === KELOMPOK_BALITA
              ? { ...r, sub: `Balita, usia di bawah ${BATAS_BALITA} tahun`, sorot: "balita" }
              : r
        )
      ) },
    { id: "pekerjaan", nama: "Pekerjaan", icon: IconBriefcase, judul: "Pekerjaan", ket: "8 pekerjaan terbanyak, sisanya digabung di “Lainnya”", rows: urutkan(perPekerjaan) },
    { id: "agama", nama: "Agama", icon: IconBook, judul: "Agama", ket: "Jumlah penduduk menurut agama", rows: urutkan(perAgama) },
    { id: "nikah", nama: "Status Nikah", icon: IconHeartHandshake, judul: "Status pernikahan", ket: "Kawin, belum kawin, cerai hidup, cerai mati", rows: urutkan(perStatusKawin) },
    ...(rowsDusun.length > 1
      ? [{ id: "dusun", nama: "Per Dusun", icon: IconMapPin, judul: "Sebaran per dusun", ket: "Jumlah penduduk di tiap dusun", rows: urutkan(rowsDusun) }]
      : []),
  ].filter((t) => t.rows.length > 0);

  const tab = TAB.find((t) => t.id === tabAktif) || TAB[0];

  // --- Donut: jenis kelamin (awal) atau kategori yang dipilih ------------
  const tabDonut = donutId ? TAB.find((t) => t.id === donutId) || null : null;
  const segDonut = tabDonut ? segmenDariBaris(tabDonut.rows) : segmen;
  const totalDonut = segDonut.reduce((s, x) => s + x.jumlah, 0);
  const terbanyakDonut = tabDonut ? terbesar(tabDonut.rows) : null;
  const IkonDonut = tabDonut ? tabDonut.icon : IconGenderBalance;

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
    <section className="relative overflow-hidden bg-navy-dark py-16 md:py-24">
      {/* Cahaya lembut latar */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_85%_0%,rgba(63,169,245,0.16),transparent),radial-gradient(45%_40%_at_5%_100%,rgba(232,185,51,0.10),transparent)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-6">
        {/* Judul */}
        <div className="flex flex-col items-center gap-4 text-center md:flex-row md:items-end md:justify-between md:text-left">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-gold">Data Terbuka</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-white sm:text-4xl">
              Desa Dalam Angka
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/60 md:mx-0">
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
        <div className="mt-6 flex justify-center md:justify-start">
          <TombolUnduh detail={detail} perDusun={perDusun} namaDesa={namaDesa} wilayah={wilayah} />
        </div>

        {/* Sekilas */}
        {sekilas.length > 0 && (
          <div
            className={`mt-10 grid grid-cols-2 gap-3 ${kolomSekilas}`}
          >
            {sekilas.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => pilihTab(s.tab)}
                className="group rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center transition duration-300 hover:-translate-y-0.5 sm:text-left hover:border-gold/40 hover:bg-white/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
              >
                <p className="text-[11px] uppercase tracking-widest text-white/45">{s.label}</p>
                <p className="mt-2 break-words font-display text-lg font-semibold leading-snug text-white sm:text-xl">
                  {/* spasi tak terlihat setelah "/" supaya "Nelayan/Perikanan" turun baris di garis miring, bukan di tengah kata */}
                  {s.juara.label.replace(/\//g, "/\u200B")}
                </p>
                <p className="mt-1 text-xs text-gold-light">
                  {fmt(s.juara.jumlah)} orang · {fmtPersen(s.juara.jumlah, totalPenduduk)}
                </p>
              </button>
            ))}
            {balita.tersedia && (
              <button
                type="button"
                onClick={() => pilihTab("usia")}
                className={`group ${spanKhusus} rounded-2xl border border-teal-300/25 bg-teal-400/[0.08] p-4 text-center transition duration-300 hover:border-teal-300/50 hover:bg-teal-400/[0.12] focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 sm:text-left lg:col-span-1`}
              >
                <p className="flex items-center justify-center gap-1.5 text-[11px] uppercase tracking-widest text-teal-200/70 sm:justify-start">
                  <IconBalita className="h-3.5 w-3.5" />
                  Penduduk balita
                </p>
                <p className="mt-2 font-display text-lg font-semibold tabular-nums text-white sm:text-xl">
                  {fmt(balita.jumlah)} orang
                </p>
                <p className="mt-1 text-xs text-teal-200">
                  {fmtPersen(balita.jumlah, totalPenduduk)} · usia di bawah {BATAS_BALITA} tahun
                </p>
              </button>
            )}
            {lansia.tersedia && (
              <button
                type="button"
                onClick={() => pilihTab("usia")}
                className={`group ${spanKhusus} rounded-2xl border border-violet-300/25 bg-violet-400/[0.08] p-4 text-center transition duration-300 hover:border-violet-300/50 hover:bg-violet-400/[0.12] focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 sm:text-left lg:col-span-1`}
              >
                <p className="flex items-center justify-center gap-1.5 text-[11px] uppercase tracking-widest text-violet-200/70 sm:justify-start">
                  <IconLansia className="h-3.5 w-3.5" />
                  Penduduk lansia
                </p>
                <p className="mt-2 font-display text-lg font-semibold tabular-nums text-white sm:text-xl">
                  {fmt(lansia.jumlah)} orang
                </p>
                <p className="mt-1 text-xs text-violet-200">
                  {fmtPersen(lansia.jumlah, totalPenduduk)} · usia {BATAS_LANSIA} tahun ke atas
                </p>
              </button>
            )}
          </div>
        )}

        {/* Donut + Rincian */}
        <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {/* Donut: jenis kelamin (awal) atau kategori yang sedang dipilih */}
          <div className="flex min-w-0 flex-col rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur sm:p-8">
            <div key={`kepala-${donutId || "jk"}`} className="flex items-center gap-3 motion-safe:animate-pageIn">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-gold-light">
                <IkonDonut className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate font-display text-base font-semibold text-white">
                  {tabDonut ? tabDonut.judul : "Jenis Kelamin"}
                </h3>
                <p className="text-xs text-white/45">
                  {tabDonut ? "Perbandingan jumlah penduduk" : "Perbandingan laki-laki dan perempuan"}
                </p>
              </div>
              {tabDonut && (
                <button
                  type="button"
                  onClick={() => setDonutId(null)}
                  aria-label="Kembali menampilkan komposisi penduduk menurut jenis kelamin"
                  className="ml-auto shrink-0 rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
                >
                  ← Penduduk
                </button>
              )}
            </div>

            <div className="my-auto py-6">
            <div>
              <Donut
                segmen={segDonut}
                angkaTengah={totalPenduduk}
                labelTengah={tabDonut ? tabDonut.nama : "Penduduk"}
                kunci={donutId || "jk"}
                deskripsi={`Komposisi penduduk${tabDonut ? ` menurut ${tabDonut.judul.toLowerCase()}` : ""}: ${segDonut.map((s) => `${s.label} ${fmt(s.jumlah)}`).join(", ")}`}
              />
            </div>

            <ul key={`legenda-${donutId || "jk"}`} className="mt-6 space-y-3 motion-safe:animate-pageIn">
              {segDonut.map((s) => (
                <li key={s.label} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2.5 text-white/75">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.warna }} />
                    <span className="truncate" title={s.label}>{s.label}</span>
                  </span>
                  <span className="shrink-0 whitespace-nowrap tabular-nums">
                    <span className="font-semibold text-white">{fmt(s.jumlah)}</span>
                    <span className="ml-2 text-xs text-white/40">{fmtPersen(s.jumlah, totalDonut)}</span>
                  </span>
                </li>
              ))}
            </ul>

            {!tabDonut && rasio && (
              <p className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs leading-relaxed text-white/55">
                Rasio jenis kelamin{" "}
                <span className="font-semibold text-gold-light">{rasio}</span>: ada {rasio} laki-laki untuk setiap 100 perempuan.
              </p>
            )}
            {terbanyakDonut && (
              <p className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs leading-relaxed text-white/55">
                Terbanyak:{" "}
                <span className="font-semibold text-gold-light">{terbanyakDonut.label}</span>,{" "}
                {fmt(terbanyakDonut.jumlah)} orang ({fmtPersen(terbanyakDonut.jumlah, totalDonut)}).
              </p>
            )}
            </div>
          </div>

          {/* Rincian bertab */}
          <div className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur sm:p-8">
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
                    onClick={() => pilihTab(t.id)}
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
                <DaftarBatang key={tab.id} rows={tab.rows} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
