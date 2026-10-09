"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconUsers, IconIdCard, IconArrowRight } from "@/components/icons";

// ---------------------------------------------------------------------------
// Statistik kependudukan untuk beranda dashboard (admin/staf).
// Murni SVG + CSS (tanpa library grafik) supaya ringan dan tidak menambah
// dependensi. Data = angka agregat dari RPC yang sama dengan beranda publik.
// ---------------------------------------------------------------------------

// Warna jenis kelamin dipakai konsisten di donat, kartu, dan grafik dusun.
const WARNA_L = "#1E5AA8";
const WARNA_P = "#E8B933";
const WARNA_KOSONG = "#CBD5E1";
const WARNA_LAINNYA = "#94A3B8";
const PALET = [
  "#0B2C6B", "#3FA9F5", "#E8B933", "#10B981",
  "#8B5CF6", "#F97316", "#EC4899", "#14B8A6",
];

const fmt = (n) => Number(n || 0).toLocaleString("id-ID");
const persen = (n, total) =>
  total ? `${((n / total) * 100).toFixed(1).replace(".", ",")}%` : "0%";

const adalahKosong = (label) => label === "Belum Diisi";

function warnaKategori(label, i) {
  if (adalahKosong(label)) return WARNA_KOSONG;
  if (label === "Lainnya") return WARNA_LAINNYA;
  return PALET[i % PALET.length];
}

function cariJumlah(daftar, label) {
  return daftar.find((d) => d.label === label)?.jumlah ?? 0;
}

// Angka naik pelan dari 0 (hormati pengaturan "kurangi gerakan" perangkat).
function useCountUp(target, durasi = 900) {
  const [nilai, setNilai] = useState(0);
  useEffect(() => {
    const akhir = Number(target) || 0;
    const kurangiGerak =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (akhir === 0 || kurangiGerak) {
      setNilai(akhir);
      return;
    }
    const mulai = performance.now();
    let frame;
    const tick = (now) => {
      const p = Math.min((now - mulai) / durasi, 1);
      setNilai(Math.round(akhir * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durasi]);
  return nilai;
}

function Angka({ value, className = "" }) {
  const n = useCountUp(value);
  return <span className={`tabular-nums ${className}`}>{fmt(n)}</span>;
}

// ---------------------------------------------------------------------------
// Kartu angka utama
// ---------------------------------------------------------------------------
function KartuUtama({ label, nilai, ket, ikon, gelap = false, warna, className = "" }) {
  const dasar = gelap
    ? "bg-gradient-to-br from-navy-dark via-navy to-navy-light text-white border-transparent"
    : "bg-white text-slate-800 border-slate-200";
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md sm:p-5 ${dasar} ${className}`}
    >
      {gelap && (
        <span
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gold/20 blur-2xl"
        />
      )}
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-xs font-medium ${gelap ? "text-white/60" : "text-slate-400"}`}>
            {label}
          </p>
          <p className="mt-1 font-display text-3xl font-semibold leading-none sm:text-4xl">
            <Angka value={nilai} />
          </p>
          {ket && (
            <p className={`mt-2 text-xs ${gelap ? "text-white/60" : "text-slate-500"}`}>{ket}</p>
          )}
        </div>
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${
            gelap ? "bg-white/10 text-gold-light" : ""
          }`}
          style={gelap ? undefined : { backgroundColor: `${warna}1A`, color: warna }}
        >
          {ikon}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grafik
// ---------------------------------------------------------------------------
function Donat({ data, total, siap, ukuran = 176, tebal = 24, pusatLabel = "Total" }) {
  const r = (ukuran - tebal) / 2;
  const keliling = 2 * Math.PI * r;
  const aktif = data.filter((d) => d.jumlah > 0);
  const celah = aktif.length > 1 ? 3 : 0;

  let geser = 0;
  const irisan = aktif.map((d) => {
    const panjang = (d.jumlah / total) * keliling;
    const item = { ...d, panjang: Math.max(panjang - celah, 0), geser };
    geser += panjang;
    return item;
  });

  return (
    <div className="relative mx-auto" style={{ width: ukuran, height: ukuran }}>
      <svg
        viewBox={`0 0 ${ukuran} ${ukuran}`}
        width={ukuran}
        height={ukuran}
        role="img"
        aria-label={`Grafik donat, total ${fmt(total)}`}
      >
        <circle
          cx={ukuran / 2}
          cy={ukuran / 2}
          r={r}
          fill="none"
          stroke="#F1F5F9"
          strokeWidth={tebal}
        />
        <g transform={`rotate(-90 ${ukuran / 2} ${ukuran / 2})`}>
          {irisan.map((d) => (
            <circle
              key={d.label}
              cx={ukuran / 2}
              cy={ukuran / 2}
              r={r}
              fill="none"
              stroke={d.warna}
              strokeWidth={tebal}
              strokeDasharray={`${siap ? d.panjang : 0} ${keliling}`}
              strokeDashoffset={-d.geser}
              className="transition-[stroke-dasharray] duration-1000 ease-out motion-reduce:transition-none"
            >
              <title>{`${d.label}: ${fmt(d.jumlah)} (${persen(d.jumlah, total)})`}</title>
            </circle>
          ))}
        </g>
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="font-display text-2xl font-semibold text-slate-800">
          <Angka value={total} />
        </p>
        <p className="text-[11px] text-slate-400">{pusatLabel}</p>
      </div>
    </div>
  );
}

function Legenda({ data, total }) {
  return (
    <ul className="mt-4 space-y-1.5">
      {data.map((d) => (
        <li key={d.label} className="flex items-center justify-between gap-3 text-sm">
          <span className="flex min-w-0 items-center gap-2 text-slate-600">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: d.warna }}
            />
            <span className="truncate">{d.label}</span>
          </span>
          <span className="shrink-0 tabular-nums text-slate-500">
            <b className="font-semibold text-slate-700">{fmt(d.jumlah)}</b>{" "}
            <span className="text-xs text-slate-400">({persen(d.jumlah, total)})</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function BarisMendatar({ data, total, siap }) {
  const maks = Math.max(...data.map((d) => d.jumlah), 1);
  return (
    <ul className="space-y-3">
      {data.map((d, i) => (
        <li key={d.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-slate-600">{d.label}</span>
            <span className="shrink-0 tabular-nums">
              <b className="font-semibold text-slate-700">{fmt(d.jumlah)}</b>{" "}
              <span className="text-xs text-slate-400">{persen(d.jumlah, total)}</span>
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
              style={{
                width: siap ? `${(d.jumlah / maks) * 100}%` : "0%",
                backgroundColor: d.warna,
                transitionDelay: `${i * 60}ms`,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function BatangUsia({ data, total, siap }) {
  const maks = Math.max(...data.map((d) => d.jumlah), 1);
  const singkat = (l) => (adalahKosong(l) ? "?" : l.replace(" Tahun", ""));
  return (
    <div>
      <div className="flex h-44 items-end gap-1.5 sm:gap-2.5">
        {data.map((d, i) => (
          <div key={d.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
            <span className="mb-1 text-[10px] font-semibold tabular-nums text-slate-600 sm:text-xs">
              {fmt(d.jumlah)}
            </span>
            <div
              className="w-full rounded-t-lg transition-[height] duration-700 ease-out motion-reduce:transition-none"
              style={{
                height: siap ? `${Math.max((d.jumlah / maks) * 100, d.jumlah ? 3 : 0)}%` : "0%",
                background: adalahKosong(d.label)
                  ? WARNA_KOSONG
                  : "linear-gradient(to top, #0B2C6B, #3FA9F5)",
                transitionDelay: `${i * 60}ms`,
              }}
              title={`${d.label}: ${fmt(d.jumlah)} (${persen(d.jumlah, total)})`}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5 border-t border-slate-100 pt-2 sm:gap-2.5">
        {data.map((d) => (
          <span
            key={d.label}
            className="min-w-0 flex-1 text-center text-[10px] text-slate-400 sm:text-xs"
          >
            {singkat(d.label)}
          </span>
        ))}
      </div>
      <p className="mt-1 text-center text-[11px] text-slate-300">Kelompok usia (tahun)</p>
    </div>
  );
}

function BatangDusun({ data, siap }) {
  const maks = Math.max(...data.map((d) => d.jumlah), 1);
  return (
    <ul className="space-y-3.5">
      {data.map((d, i) => {
        const lain = Math.max(d.jumlah - d.laki - d.perempuan, 0);
        const lebar = (x) => `${(x / maks) * 100}%`;
        return (
          <li key={d.label}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate font-medium text-slate-600">{d.label}</span>
              <span className="shrink-0 text-xs tabular-nums text-slate-400">
                <b className="text-sm font-semibold text-slate-700">{fmt(d.jumlah)}</b> jiwa
              </span>
            </div>
            <div
              className="flex h-3 overflow-hidden rounded-full bg-slate-100"
              title={`Laki-laki ${fmt(d.laki)} · Perempuan ${fmt(d.perempuan)}`}
            >
              {[
                [d.laki, WARNA_L],
                [d.perempuan, WARNA_P],
                [lain, WARNA_KOSONG],
              ].map(([n, w], k) => (
                <div
                  key={k}
                  className="h-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
                  style={{
                    width: siap ? lebar(n) : "0%",
                    backgroundColor: w,
                    transitionDelay: `${i * 60}ms`,
                  }}
                />
              ))}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              L {fmt(d.laki)} · P {fmt(d.perempuan)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

function Panel({ judul, ket, children, className = "" }) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}
    >
      <h3 className="text-sm font-bold text-slate-800">{judul}</h3>
      {ket && <p className="mt-0.5 text-xs text-slate-400">{ket}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Sorotan({ ikon, teks }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm">
      <span aria-hidden>{ikon}</span>
      {teks}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Komponen utama
// ---------------------------------------------------------------------------
export default function StatistikDashboard({ ringkas, detail, perDusun }) {
  const [siap, setSiap] = useState(false);
  const [tampilGrafik, setTampilGrafik] = useState(true);

  useEffect(() => {
    const f = requestAnimationFrame(() => setSiap(true));
    return () => cancelAnimationFrame(f);
  }, []);

  // Ingat pilihan buka/tutup grafik (sama seperti sidebar).
  useEffect(() => {
    try {
      setTampilGrafik(localStorage.getItem("si-lipu-stat-grafik") !== "0");
    } catch {}
  }, []);

  function ubahTampil() {
    setTampilGrafik((v) => {
      const baru = !v;
      try {
        localStorage.setItem("si-lipu-stat-grafik", baru ? "1" : "0");
      } catch {}
      return baru;
    });
  }

  const total = ringkas.totalPenduduk;
  const kk = ringkas.totalKepalaKeluarga;
  const laki = cariJumlah(detail.perJenisKelamin, "Laki-laki");
  const perempuan = cariJumlah(detail.perJenisKelamin, "Perempuan");
  const belumJk = cariJumlah(detail.perJenisKelamin, "Belum Diisi");

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Statistik kependudukan
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Ringkasan seluruh data penduduk desa, selalu mengikuti data terbaru.
        </p>
      </div>
      <Link
        href="/dashboard/kependudukan"
        className="inline-flex items-center gap-1 text-xs font-medium text-navy hover:underline"
      >
        Buka Data Kependudukan <IconArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );

  if (total === 0) {
    return (
      <section className="space-y-3">
        {header}
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm font-semibold text-slate-600">Belum ada data penduduk</p>
          <p className="mt-1 text-xs text-slate-400">
            Statistik akan muncul otomatis setelah data warga ditambahkan atau diimpor.
          </p>
        </div>
      </section>
    );
  }

  // ---- olah data grafik ----
  const dataJk = detail.perJenisKelamin.map((d) => ({
    ...d,
    warna: d.label === "Laki-laki" ? WARNA_L : d.label === "Perempuan" ? WARNA_P : WARNA_KOSONG,
  }));
  const dataAgama = detail.perAgama.map((d, i) => ({ ...d, warna: warnaKategori(d.label, i) }));
  const dataKawin = detail.perStatusKawin.map((d, i) => ({ ...d, warna: warnaKategori(d.label, i) }));
  const dataKerja = detail.perPekerjaan.map((d, i) => ({ ...d, warna: warnaKategori(d.label, i) }));

  // ---- sorotan singkat ----
  const terisi = (arr) => arr.filter((d) => !adalahKosong(d.label) && d.label !== "Lainnya");
  const usiaTerbanyak = [...terisi(detail.perRentangUsia)].sort((a, b) => b.jumlah - a.jumlah)[0];
  const kerjaTerbanyak = [...terisi(detail.perPekerjaan)].sort((a, b) => b.jumlah - a.jumlah)[0];
  const dusunTerpadat = [...perDusun.filter((d) => !adalahKosong(d.label))].sort(
    (a, b) => b.jumlah - a.jumlah
  )[0];
  const rataKK = kk ? (total / kk).toFixed(1).replace(".", ",") : null;

  return (
    <section className="space-y-4">
      {header}

      {/* Kartu angka utama */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KartuUtama
          gelap
          className="col-span-2 lg:col-span-1"
          label="Jumlah Penduduk"
          nilai={total}
          ket={rataKK ? `Rata-rata ${rataKK} jiwa per KK` : "Seluruh warga terdata"}
          ikon={<IconUsers className="h-5 w-5" />}
        />
        <KartuUtama
          className="order-last col-span-2 lg:order-none lg:col-span-1"
          label="Kartu Keluarga"
          nilai={kk}
          ket="Jumlah No. KK terdata"
          warna="#10B981"
          ikon={<IconIdCard className="h-5 w-5" />}
        />
        <KartuUtama
          label="Laki-laki"
          nilai={laki}
          ket={`${persen(laki, total)} dari penduduk`}
          warna={WARNA_L}
          ikon="♂"
        />
        <KartuUtama
          label="Perempuan"
          nilai={perempuan}
          ket={`${persen(perempuan, total)} dari penduduk`}
          warna="#C99A12"
          ikon="♀"
        />
      </div>

      {/* Sorotan singkat */}
      <div className="flex flex-wrap gap-2">
        {usiaTerbanyak && (
          <Sorotan
            ikon="🎂"
            teks={`Usia terbanyak: ${usiaTerbanyak.label} (${fmt(usiaTerbanyak.jumlah)})`}
          />
        )}
        {kerjaTerbanyak && (
          <Sorotan
            ikon="💼"
            teks={`Pekerjaan terbanyak: ${kerjaTerbanyak.label} (${fmt(kerjaTerbanyak.jumlah)})`}
          />
        )}
        {dusunTerpadat && perDusun.length > 1 && (
          <Sorotan
            ikon="📍"
            teks={`Dusun terpadat: ${dusunTerpadat.label} (${fmt(dusunTerpadat.jumlah)} jiwa)`}
          />
        )}
        {belumJk > 0 && (
          <Link
            href="/dashboard/kependudukan?kurang=1"
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-800 hover:bg-amber-100"
          >
            ⚠ {fmt(belumJk)} data belum diisi jenis kelaminnya
          </Link>
        )}
      </div>

      {/* Tombol buka/tutup grafik */}
      <button
        type="button"
        onClick={ubahTampil}
        aria-expanded={tampilGrafik}
        className="text-xs font-medium text-slate-500 hover:text-slate-700"
      >
        {tampilGrafik ? "▾ Sembunyikan grafik rincian" : "▸ Tampilkan grafik rincian"}
      </button>

      {tampilGrafik && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Panel judul="Jenis Kelamin" ket="Perbandingan laki-laki dan perempuan">
              <Donat data={dataJk} total={total} siap={siap} />
              <Legenda data={dataJk} total={total} />
            </Panel>

            <Panel
              judul="Kelompok Usia"
              ket="Jumlah penduduk menurut rentang umur"
              className="lg:col-span-2"
            >
              <BatangUsia data={detail.perRentangUsia} total={total} siap={siap} />
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {perDusun.length > 0 && (
              <Panel judul="Penduduk per Dusun" ket="Biru laki-laki, kuning perempuan">
                <BatangDusun data={perDusun} siap={siap} />
                <div className="mt-4 flex gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: WARNA_L }} />
                    Laki-laki
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: WARNA_P }} />
                    Perempuan
                  </span>
                </div>
              </Panel>
            )}

            <Panel judul="Status Pernikahan" ket="Menurut status kawin yang tercatat">
              <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-start sm:gap-6">
                <div className="shrink-0">
                  <Donat data={dataKawin} total={total} siap={siap} ukuran={152} tebal={22} />
                </div>
                <div className="w-full min-w-0 flex-1">
                  <Legenda data={dataKawin} total={total} />
                </div>
              </div>
            </Panel>

            <Panel judul="Agama" ket="Jumlah penduduk menurut agama">
              <BarisMendatar data={dataAgama} total={total} siap={siap} />
            </Panel>

            <Panel judul="Pekerjaan" ket="Delapan pekerjaan terbanyak, sisanya digabung">
              <BarisMendatar data={dataKerja} total={total} siap={siap} />
            </Panel>
          </div>
        </div>
      )}
    </section>
  );
}
