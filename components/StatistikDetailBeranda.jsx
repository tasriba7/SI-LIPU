"use client";

import { useEffect, useState } from "react";
import {
  IconBook,
  IconHeartHandshake,
  IconGenderBalance,
  IconCalendarRange,
  IconBriefcase,
} from "@/components/icons";

// Satu baris diagram batang horizontal: label di atas, batang warna di
// bawah yang panjangnya proporsional terhadap total kategori. Batang
// "tumbuh" dari 0% ke nilai asli sesaat setelah kartu dimuat (lewat prop
// `animate`) supaya terasa hidup tanpa jadi ramai.
function BarisBatang({ label, jumlah, persen, warna, animate }) {
  const lebar = animate ? Math.max(persen, jumlah > 0 ? 2 : 0) : 0;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="truncate text-sm text-slate-600" title={label}>
          {label}
        </span>
        <span className="shrink-0 whitespace-nowrap">
          <span className="text-sm font-semibold tabular-nums text-slate-800">
            {jumlah.toLocaleString("id-ID")}
          </span>
          <span className="ml-1.5 text-xs font-medium tabular-nums text-slate-400">
            {persen.toFixed(0)}%
          </span>
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${warna} transition-[width] duration-700 ease-out`}
          style={{ width: `${lebar}%` }}
        />
      </div>
    </div>
  );
}

// Satu kartu diagram: judul + ikon di atas, daftar BarisBatang di bawah.
// Persentase dihitung relatif terhadap total baris di kartu itu sendiri
// (bukan total penduduk desa), supaya tetap akurat walau ada data warga
// yang belum lengkap (masuk kelompok "Belum Diisi").
//
// `warna` = gradient default untuk semua baris di kartu ini.
// `warnaPerBaris(label)` = opsional, override warna per baris (dipakai di
// kartu Jenis Kelamin supaya Laki-laki & Perempuan punya warna kontras).
function TabelKelompok({ icon: Icon, title, subtitle, data, warna, warnaPerBaris }) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(t);
  }, []);

  const total = data.reduce((sum, row) => sum + row.jumlah, 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-gold/40 hover:shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy/5 text-navy">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-display text-base font-semibold text-slate-800">
            {title}
          </h3>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {data.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            Data belum tersedia.
          </p>
        ) : (
          data.map((row) => {
            const persen = total > 0 ? (row.jumlah / total) * 100 : 0;
            return (
              <BarisBatang
                key={row.label}
                label={row.label}
                jumlah={row.jumlah}
                persen={persen}
                animate={animate}
                warna={warnaPerBaris ? warnaPerBaris(row.label) : warna}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

// Warna khusus per jenis kelamin supaya perbandingan Laki-laki/Perempuan
// langsung kebaca sekilas — navy untuk Laki-laki, emas untuk Perempuan,
// abu-abu netral untuk data yang belum diisi.
function warnaJenisKelamin(label) {
  if (label === "Laki-laki") return "from-navy to-navy-light";
  if (label === "Perempuan") return "from-gold to-gold-light";
  return "from-slate-400 to-slate-300";
}

export default function StatistikDetailBeranda({ detail }) {
  const {
    perAgama = [],
    perStatusKawin = [],
    perJenisKelamin = [],
    perRentangUsia = [],
    perPekerjaan = [],
  } = detail || {};

  const kosong =
    perAgama.length === 0 &&
    perStatusKawin.length === 0 &&
    perJenisKelamin.length === 0 &&
    perRentangUsia.length === 0 &&
    perPekerjaan.length === 0;

  if (kosong) return null;

  return (
    <section className="bg-slate-50 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-seablue">
          Data Terbuka
        </p>
        <h2 className="mt-3 font-display text-2xl font-semibold text-navy sm:text-3xl">
          Statistik Kependudukan Desa
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
          Rincian jumlah penduduk berdasarkan kategori umum, dirangkum
          otomatis dari data kependudukan desa. Hanya angka agregat yang
          ditampilkan — tidak ada data pribadi warga yang dibuka ke publik.
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <TabelKelompok
            icon={IconGenderBalance}
            title="Jenis Kelamin"
            subtitle="Perbandingan penduduk laki-laki dan perempuan"
            data={perJenisKelamin}
            warnaPerBaris={warnaJenisKelamin}
          />
          <TabelKelompok
            icon={IconHeartHandshake}
            title="Status Pernikahan"
            subtitle="Kawin, belum kawin, cerai hidup, cerai mati"
            data={perStatusKawin}
            warna="from-gold to-gold-light"
          />
          <TabelKelompok
            icon={IconBook}
            title="Agama"
            subtitle="Jumlah penduduk berdasarkan agama"
            data={perAgama}
            warna="from-navy to-navy-light"
          />
          <TabelKelompok
            icon={IconCalendarRange}
            title="Rentang Usia"
            subtitle="Kelompok umur penduduk"
            data={perRentangUsia}
            warna="from-seablue to-navy"
          />
          <TabelKelompok
            icon={IconBriefcase}
            title="Pekerjaan"
            subtitle="8 pekerjaan terbanyak, sisanya digabung di 'Lainnya'"
            data={perPekerjaan}
            warna="from-navy to-seablue"
          />
        </div>
      </div>
    </section>
  );
}
