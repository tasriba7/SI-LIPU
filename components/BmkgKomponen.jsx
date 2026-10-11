import {
  SUMBER_BMKG,
  emojiCuaca,
  formatHariTanggal,
  jarakKm,
  tingkatGempa,
} from "@/lib/bmkg";
import { IconMapPin } from "@/components/icons";

// Potongan tampilan data BMKG, dipakai bersama oleh beranda (BmkgBeranda)
// dan halaman penuh /cuaca. Semuanya Server Component: tanpa JavaScript di
// browser. Data berasal dari lib/bmkg.js.

const WARNA_GEMPA = {
  rendah: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  sedang: "bg-amber-100 text-amber-800 ring-amber-200",
  tinggi: "bg-rose-100 text-rose-800 ring-rose-200",
};

const LABEL_GEMPA = {
  rendah: "Magnitudo kecil",
  sedang: "Magnitudo sedang",
  tinggi: "Magnitudo besar",
};

function formatMagnitudo(m) {
  return typeof m === "number" ? m.toFixed(1).replace(".", ",") : "–";
}

// --------------------------------------------------------------- atribusi

/** Pencantuman sumber data — WAJIB ada di setiap halaman yang menampilkan data BMKG. */
export function AtribusiBmkg({ className = "" }) {
  return (
    <p className={`text-xs leading-relaxed text-slate-400 ${className}`}>
      Sumber data:{" "}
      <a
        href={SUMBER_BMKG.url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-navy"
      >
        {SUMBER_BMKG.nama} ({SUMBER_BMKG.namaLengkap})
      </a>
      .
    </p>
  );
}

// --------------------------------------------------------- pesan kosong

export function PesanBmkg({ judul, teks }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-5 py-8 text-center">
      <p className="text-sm font-semibold text-slate-600">{judul}</p>
      {teks && <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-400">{teks}</p>}
    </div>
  );
}

export function PesanCuacaTidakAda({ status }) {
  if (status === "belum_diatur") {
    return (
      <PesanBmkg
        judul="Lokasi cuaca desa belum diatur"
        teks="Perangkat desa perlu melengkapi provinsi, kabupaten, kecamatan, dan nama desa di menu Pengaturan Desa."
      />
    );
  }
  return (
    <PesanBmkg
      judul="Prakiraan cuaca sedang tidak dapat ditampilkan"
      teks="Layanan BMKG mungkin sedang sibuk atau gangguan. Silakan coba lagi beberapa saat lagi."
    />
  );
}

// ------------------------------------------------------------ ikon cuaca

function IkonCuaca({ slot, ukuran = "h-14 w-14", teks = "text-4xl" }) {
  if (slot?.ikon) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={slot.ikon}
        alt={slot.kondisi || "Kondisi cuaca"}
        loading="lazy"
        className={`${ukuran} shrink-0 object-contain`}
      />
    );
  }
  return (
    <span aria-hidden className={`${teks} leading-none`}>
      {emojiCuaca(slot?.kondisi)}
    </span>
  );
}

function namaLokasi(lokasi) {
  return [lokasi.desa, lokasi.kecamatan, lokasi.kabupatenKota].filter(Boolean).join(", ");
}

function Rincian({ label, nilai }) {
  if (nilai === null || nilai === undefined || nilai === "") return null;
  return (
    <div className="rounded-xl bg-white/10 px-3 py-2.5 ring-1 ring-white/15">
      <p className="text-[11px] uppercase tracking-wider text-white/55">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-white">{nilai}</p>
    </div>
  );
}

// -------------------------------------------------------- cuaca sekarang

/**
 * Kartu cuaca saat ini (latar navy). `ringkas` = untuk beranda: tanpa baris rincian
 * lengkap, tetapi dengan deretan jam berikutnya.
 */
export function KartuCuacaSekarang({ cuaca, ringkas = false }) {
  const s = cuaca.sekarang;
  if (!s) return null;
  const zona = cuaca.lokasi.zona ? ` ${cuaca.lokasi.zona}` : "";

  return (
    <article className="relative overflow-hidden rounded-3xl border border-navy-light/50 bg-gradient-to-br from-navy via-navy-light to-navy-dark p-6 text-white shadow-xl shadow-navy/25 sm:p-8">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gold/20 blur-3xl" />

      <p className="relative flex items-center gap-1.5 text-xs text-white/70">
        <IconMapPin className="h-3.5 w-3.5 text-gold-light" />
        {namaLokasi(cuaca.lokasi) || "Wilayah desa"}
      </p>

      <div className="relative mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-4">
          <IkonCuaca slot={s} ukuran="h-20 w-20" teks="text-6xl" />
          <p className="font-display text-6xl font-bold leading-none sm:text-7xl">
            {s.suhu !== null ? Math.round(s.suhu) : "–"}
            <span className="align-top text-3xl font-medium text-gold-light">°C</span>
          </p>
        </div>
        <div>
          <p className="font-display text-xl font-semibold text-gold-light sm:text-2xl">
            {s.kondisi || "Prakiraan cuaca"}
          </p>
          <p className="mt-1 text-xs text-white/60">
            Prakiraan pukul {s.jam}
            {zona} · {formatHariTanggal(s.tanggal)}
          </p>
        </div>
      </div>

      {!ringkas && (
        <div className="relative mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Rincian label="Kelembapan" nilai={s.lembap !== null ? `${s.lembap}%` : null} />
          <Rincian
            label="Angin"
            nilai={
              s.kecepatanAngin !== null
                ? `${Math.round(s.kecepatanAngin)} km/jam${s.arahAngin ? ` dari ${s.arahAngin}` : ""}`
                : null
            }
          />
          <Rincian label="Tutupan awan" nilai={s.awan !== null ? `${s.awan}%` : null} />
          <Rincian label="Jarak pandang" nilai={s.jarakPandang || null} />
        </div>
      )}

      {ringkas && cuaca.mendatang.length > 0 && (
        <ul className="relative mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {cuaca.mendatang.map((m) => (
            <li
              key={m.waktuLokal}
              className="flex flex-col items-center rounded-xl bg-white/10 px-2 py-3 text-center ring-1 ring-white/15"
            >
              <span className="text-[11px] text-white/60">{m.jam}</span>
              <IkonCuaca slot={m} ukuran="h-9 w-9" teks="text-2xl" />
              <span className="mt-1 text-sm font-semibold">
                {m.suhu !== null ? `${Math.round(m.suhu)}°` : "–"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

// ------------------------------------------------------ prakiraan harian

/** Prakiraan per hari: setiap hari satu baris yang bisa digeser ke samping (per 3 jam). */
export function PrakiraanPerHari({ hari, zona }) {
  return (
    <div className="space-y-5">
      {hari.map((h) => (
        <section
          key={h.tanggal}
          className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-display text-lg font-semibold text-navy">
              {formatHariTanggal(h.tanggal)}
            </h3>
            {h.suhuMin !== null && h.suhuMax !== null && (
              <p className="text-sm text-slate-500">
                Suhu {Math.round(h.suhuMin)}° – {Math.round(h.suhuMax)}°C
              </p>
            )}
          </div>

          <ul className="mt-4 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
            {h.slot.map((s) => (
              <li
                key={s.waktuLokal}
                className="flex w-28 shrink-0 flex-col items-center rounded-xl border border-slate-100 bg-slate-50/70 px-2 py-3 text-center"
              >
                <span className="text-xs font-medium text-slate-500">
                  {s.jam}
                  {zona ? ` ${zona}` : ""}
                </span>
                <IkonCuaca slot={s} ukuran="h-10 w-10" teks="text-3xl" />
                <span className="mt-1 text-base font-semibold text-slate-800">
                  {s.suhu !== null ? `${Math.round(s.suhu)}°C` : "–"}
                </span>
                <span className="mt-0.5 line-clamp-2 min-h-[2rem] text-[11px] leading-tight text-slate-500">
                  {s.kondisi}
                </span>
                {s.lembap !== null && (
                  <span className="mt-1 text-[11px] text-slate-400">Lembap {s.lembap}%</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- gempa

function LencanaMagnitudo({ magnitude, besar = false }) {
  const tingkat = tingkatGempa(magnitude);
  return (
    <div
      title={LABEL_GEMPA[tingkat]}
      className={`flex shrink-0 flex-col items-center justify-center rounded-2xl ring-1 ${WARNA_GEMPA[tingkat]} ${
        besar ? "h-20 w-20" : "h-14 w-14"
      }`}
    >
      <span className={`font-display font-bold leading-none ${besar ? "text-3xl" : "text-xl"}`}>
        {formatMagnitudo(magnitude)}
      </span>
      <span className="text-[10px] font-medium uppercase tracking-wider opacity-70">M</span>
    </div>
  );
}

function teksJarak(gempa, titikDesa) {
  if (!titikDesa) return null;
  const km = jarakKm(titikDesa.lat, titikDesa.lon, gempa.lat, gempa.lon);
  return km === null ? null : `± ${km.toLocaleString("id-ID")} km dari desa`;
}

function tautanPeta(gempa) {
  if (gempa.lat === null || gempa.lon === null) return null;
  return `https://www.google.com/maps?q=${gempa.lat},${gempa.lon}`;
}

/** Gempa terbaru — kartu besar, dengan peta guncangan (shakemap) bila ada. */
export function KartuGempaUtama({ gempa, titikDesa = null, tampilkanPeta = true, ringkas = false }) {
  const jarak = teksJarak(gempa, titikDesa);
  const peta = tautanPeta(gempa);

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-lg shadow-slate-200/50">
      <div className={tampilkanPeta && gempa.petaGuncangan ? "grid md:grid-cols-[1.1fr_0.9fr]" : ""}>
        <div className="p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <LencanaMagnitudo magnitude={gempa.magnitude} besar />
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Gempa bumi terbaru
              </p>
              <h3 className="mt-1 font-display text-lg font-semibold leading-snug text-navy sm:text-xl">
                {gempa.wilayah}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {gempa.tanggal} · {gempa.jam}
              </p>
            </div>
          </div>

          <dl className={`mt-5 grid gap-x-6 gap-y-3 text-sm ${ringkas ? "grid-cols-2" : "sm:grid-cols-2"}`}>
            <div>
              <dt className="text-xs text-slate-400">Kedalaman</dt>
              <dd className="font-medium text-slate-700">{gempa.kedalaman || "–"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Koordinat</dt>
              <dd className="font-medium text-slate-700">
                {gempa.lintang} · {gempa.bujur}
              </dd>
            </div>
            {gempa.potensi && (
              <div className="col-span-2">
                <dt className="text-xs text-slate-400">Potensi</dt>
                <dd className="font-medium text-slate-700">{gempa.potensi}</dd>
              </div>
            )}
            {gempa.dirasakan && !ringkas && (
              <div className="col-span-2">
                <dt className="text-xs text-slate-400">Dirasakan (skala MMI)</dt>
                <dd className="font-medium text-slate-700">{gempa.dirasakan}</dd>
              </div>
            )}
          </dl>

          {(jarak || peta) && (
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              {jarak && <span className="font-medium text-navy">{jarak}</span>}
              {peta && (
                <a
                  href={peta}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-royal underline-offset-2 hover:underline"
                >
                  <IconMapPin className="h-3.5 w-3.5" />
                  Lihat lokasi di peta
                </a>
              )}
            </div>
          )}
        </div>

        {tampilkanPeta && gempa.petaGuncangan && (
          <div className="flex items-center justify-center bg-slate-50 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={gempa.petaGuncangan}
              alt={`Peta guncangan gempa ${gempa.wilayah}`}
              loading="lazy"
              className="max-h-80 w-full rounded-xl object-contain"
            />
          </div>
        )}
      </div>
    </article>
  );
}

/** Daftar gempa (M5+ atau yang dirasakan): satu baris per kejadian. */
export function DaftarGempa({ items, titikDesa = null, tampilkanDirasakan = false, kosong }) {
  if (!items || items.length === 0) {
    return <PesanBmkg judul={kosong ?? "Data gempa belum tersedia"} />;
  }

  return (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm">
      {items.map((g) => {
        const jarak = teksJarak(g, titikDesa);
        const peta = tautanPeta(g);
        return (
          <li key={g.id} className="flex items-start gap-4 px-4 py-4 sm:px-5">
            <LencanaMagnitudo magnitude={g.magnitude} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-snug text-slate-800">{g.wilayah}</p>
              <p className="mt-1 text-xs text-slate-500">
                {g.tanggal} · {g.jam}
                {g.kedalaman ? ` · Kedalaman ${g.kedalaman}` : ""}
              </p>
              {tampilkanDirasakan && g.dirasakan && (
                <p className="mt-1 text-xs text-slate-500">
                  Dirasakan: <span className="font-medium text-slate-700">{g.dirasakan}</span>
                </p>
              )}
              {(jarak || peta) && (
                <p className="mt-1 text-xs">
                  {jarak && <span className="font-medium text-navy">{jarak}</span>}
                  {jarak && peta && <span className="text-slate-300"> · </span>}
                  {peta && (
                    <a
                      href={peta}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-royal underline-offset-2 hover:underline"
                    >
                      Lihat peta
                    </a>
                  )}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
