import Link from "next/link";
import { IconCheck } from "@/components/icons";
import { formatRentang } from "@/lib/pilkadesJadwal";

// Tampilan murni (tanpa query): kartu progres + garis waktu tahapan Pilkades.
// Kelas Tailwind ditulis utuh agar terbaca saat build.

const GAYA = {
  selesai: { bulat: "bg-emerald-500 text-white", chip: "bg-emerald-100 text-emerald-800", label: "✓ Selesai", batang: "bg-emerald-500", kotak: "border-emerald-200 bg-white" },
  berlangsung: { bulat: "bg-sky-600 text-white", chip: "bg-sky-100 text-sky-800", label: "● Sedang berlangsung", batang: "bg-sky-500", kotak: "border-sky-400 bg-sky-50 ring-2 ring-sky-100" },
  akan: { bulat: "border-2 border-sky-300 bg-white text-sky-700", chip: "bg-slate-100 text-slate-700", label: "Akan datang", batang: "bg-sky-200", kotak: "border-slate-200 bg-white" },
  terlewat: { bulat: "bg-amber-500 text-white", chip: "bg-amber-100 text-amber-900", label: "! Terlewat", batang: "bg-amber-400", kotak: "border-amber-300 bg-amber-50" },
  kosong: { bulat: "border-2 border-dashed border-slate-300 bg-white text-slate-500", chip: "bg-slate-100 text-slate-600", label: "Belum dijadwalkan", batang: "bg-slate-200", kotak: "border-dashed border-slate-300 bg-white" },
};

function Cincin({ persen }) {
  const r = 42;
  const keliling = 2 * Math.PI * r;
  return (
    <div className="relative h-28 w-28 shrink-0" role="img" aria-label={`${persen} persen tahapan selesai`}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="10" className="stroke-sky-100" />
        <circle
          cx="50" cy="50" r={r} fill="none" strokeWidth="10" strokeLinecap="round"
          className="stroke-emerald-500"
          strokeDasharray={keliling}
          strokeDashoffset={keliling * (1 - persen / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold text-sky-950">{persen}%</span>
        <span className="text-xs font-semibold text-slate-600">selesai</span>
      </div>
    </div>
  );
}

/** Kartu progres: cincin persen, tahap sekarang, hitung mundur, dan bilah 10 segmen. */
export function KartuProgres({ tahap, ringkas }) {
  const { selesai, total, persen, berlangsung, terlewat, berikut, hMin } = ringkas;
  const pemungutan = tahap.find((t) => t.kunci === "pemungutan");

  let sekarang;
  if (berlangsung.length) {
    sekarang = { judul: "Sedang berlangsung", isi: berlangsung.map((t) => `${t.singkat} (${t.ket.toLowerCase()})`).join(" · "), warna: "text-sky-800" };
  } else if (terlewat.length) {
    sekarang = { judul: "Perlu dikejar", isi: terlewat.map((t) => `${t.singkat}`).join(" · ") + " — jadwal sudah lewat, belum dikerjakan.", warna: "text-amber-800" };
  } else if (berikut) {
    sekarang = { judul: "Tahap berikutnya", isi: `${berikut.singkat} · ${formatRentang(berikut.mulai, berikut.selesai)} (${berikut.ket.toLowerCase()})`, warna: "text-sky-800" };
  } else if (selesai === total) {
    sekarang = { judul: "Semua tahapan selesai", isi: "Pilkades sudah dilaksanakan sampai akhir.", warna: "text-emerald-800" };
  } else {
    sekarang = { judul: "Belum ada tahap yang sedang berjalan", isi: "Isi jadwal tahapan agar progres terlihat di sini.", warna: "text-slate-700" };
  }

  let hitungMundur = null;
  if (hMin !== null) {
    hitungMundur =
      hMin > 0 ? { besar: `H-${hMin}`, kecil: "menuju pemungutan suara" }
      : hMin === 0 ? { besar: "Hari ini", kecil: "pemungutan suara" }
      : { besar: `H+${-hMin}`, kecil: "sejak pemungutan suara" };
  }

  return (
    <section aria-labelledby="judul-progres" className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-5">
        <Cincin persen={persen} />
        <div className="min-w-0 flex-1 basis-64">
          <h2 id="judul-progres" className="text-lg font-bold text-sky-950">Progres pelaksanaan</h2>
          <p className="text-sm text-slate-700">
            <b className="text-emerald-700">{selesai}</b> dari {total} tahapan sudah selesai
          </p>
          <p className={`mt-2 text-sm leading-relaxed ${sekarang.warna}`}>
            <b>{sekarang.judul}:</b> {sekarang.isi}
          </p>
        </div>
        {hitungMundur && (
          <div className="rounded-xl bg-gradient-to-br from-sky-600 to-teal-500 px-5 py-3 text-center text-white shadow">
            <p className="text-3xl font-extrabold leading-none">{hitungMundur.besar}</p>
            <p className="mt-1 text-xs font-semibold text-sky-50">{hitungMundur.kecil}</p>
            {pemungutan?.mulai && <p className="text-xs text-sky-100">{formatRentang(pemungutan.mulai)}</p>}
          </div>
        )}
      </div>

      {/* Bilah 10 segmen: satu kotak = satu tahapan */}
      <ol className="mt-5 grid grid-cols-10 gap-1" aria-label="Status tiap tahapan">
        {tahap.map((t) => (
          <li key={t.kunci} title={`${t.no}. ${t.singkat}: ${GAYA[t.s].label.replace(/^[✓●!] /, "")}`}>
            <div className={`h-3 rounded-full ${GAYA[t.s].batang} ${t.s === "berlangsung" ? "motion-safe:animate-pulse" : ""}`} />
            <p className="mt-1 hidden truncate text-center text-[11px] font-medium text-slate-600 lg:block">{t.singkat}</p>
          </li>
        ))}
      </ol>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {[["selesai", "Selesai"], ["berlangsung", "Berlangsung"], ["terlewat", "Terlewat"], ["akan", "Akan datang"], ["kosong", "Belum dijadwalkan"]].map(([k, l]) => (
          <li key={k} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${GAYA[k].batang}`} /> {l}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Penanda({ t }) {
  const g = GAYA[t.s];
  return (
    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center">
      {t.s === "berlangsung" && <span aria-hidden className="absolute inset-0 rounded-full bg-sky-400/50 motion-safe:animate-ping" />}
      <span className={`relative flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${g.bulat}`}>
        {t.s === "selesai" ? <IconCheck className="h-5 w-5" /> : t.s === "terlewat" ? "!" : t.no}
      </span>
    </span>
  );
}

/** Garis waktu tegak: terbaca di HP maupun layar lebar. */
export function GarisWaktu({ tahap }) {
  return (
    <ol className="space-y-0">
      {tahap.map((t, i) => {
        const g = GAYA[t.s];
        const akhir = i === tahap.length - 1;
        return (
          <li key={t.kunci} className="flex gap-3">
            <div className="flex flex-col items-center">
              <Penanda t={t} />
              {!akhir && <span aria-hidden className={`my-1 w-1 flex-1 rounded-full ${t.s === "selesai" ? "bg-emerald-300" : "bg-slate-200"}`} />}
            </div>
            <div className={`mb-3 min-w-0 flex-1 rounded-xl border p-3 ${g.kotak}`}>
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                <div className="min-w-0">
                  <p className="text-base font-bold text-slate-900">{t.nama}</p>
                  <p className={`text-sm ${t.mulai ? "font-semibold text-sky-900" : "text-slate-500"}`}>
                    {t.mulai ? `📅 ${t.rentang}` : "Tanggal belum diisi"}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-sm font-semibold ${g.chip}`}>{g.label}</span>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {t.s === "berlangsung" || t.s === "akan" || t.s === "terlewat" ? <b className="text-slate-800">{t.ket}. </b> : null}
                {t.arti}
              </p>
              {t.catatan && <p className="mt-1 text-sm italic text-slate-600">Catatan: {t.catatan}</p>}
              {t.href && (t.s === "berlangsung" || t.s === "terlewat") && (
                <Link href={t.href} className="mt-2 inline-block text-sm font-bold text-sky-800 underline">
                  Buka halaman kerja →
                </Link>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
