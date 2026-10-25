import Link from "next/link";

/* Gaya bersama modul Pilkades: teks 14px (judul 20-24px), kontras tinggi, warna cerah.
 * Aturan: hanya SATU tombol utama (biru) per halaman. */

const dasar =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50";

export const tombol = {
  utama: `${dasar} bg-sky-600 text-white shadow-sm hover:bg-sky-700 focus-visible:ring-sky-300`,
  sekunder: `${dasar} border border-sky-200 bg-white text-sky-800 hover:bg-sky-50 focus-visible:ring-sky-200`,
  hijau: `${dasar} bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus-visible:ring-emerald-300`,
  bahaya: `${dasar} bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-300`,
  kecil: "inline-flex items-center justify-center rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300",
};

export const kolom =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100";

export const kolomKecil =
  "rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100";

export const labelKolom = "mb-1 block text-sm font-semibold text-slate-800";

export function IconKunci(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden {...props}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path strokeLinecap="round" d="M8 11V8a4 4 0 018 0v3" />
    </svg>
  );
}

export function JudulHalaman({ langkah, judul, penjelasan }) {
  return (
    <div>
      {langkah && (
        <p className="text-xs font-bold uppercase tracking-wide text-sky-700">Langkah {langkah} dari 6</p>
      )}
      <h1 className="mt-1 text-xl font-bold text-sky-950 md:text-2xl">{judul}</h1>
      {penjelasan && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700">{penjelasan}</p>}
    </div>
  );
}

// Gaya pesan: garis warna di kiri + latar lembut. Satu bahasa visual untuk semua halaman.
const GAYA_PESAN = {
  info: ["border-sky-500 bg-sky-50 text-sky-950", "bg-sky-600", "i"],
  sukses: ["border-emerald-500 bg-emerald-50 text-emerald-950", "bg-emerald-600", "✓"],
  perhatian: ["border-amber-500 bg-amber-50 text-amber-950", "bg-amber-500", "!"],
  bahaya: ["border-red-500 bg-red-50 text-red-950", "bg-red-600", "!"],
};

/** Satu pesan. `onTutup` (opsional) menampilkan tombol ×. */
export function Pesan({ jenis = "info", judul, onTutup, children }) {
  const [kotak, bulat, simbol] = GAYA_PESAN[jenis] ?? GAYA_PESAN.info;
  const isi = children !== undefined && children !== null && children !== false && children !== "";
  return (
    <div
      role={jenis === "bahaya" ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-lg border-l-4 px-3 py-2.5 ${kotak}`}
    >
      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${bulat}`}>
        {simbol}
      </span>
      <div className="min-w-0 flex-1 text-sm leading-relaxed">
        {judul && <p className="font-bold">{judul}</p>}
        {isi && <div className={judul ? "mt-0.5" : ""}>{children}</div>}
      </div>
      {onTutup && (
        <button
          type="button"
          onClick={onTutup}
          aria-label="Tutup pesan"
          className="-mr-1 -mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-lg leading-none text-slate-500 hover:bg-white/70 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          ×
        </button>
      )}
    </div>
  );
}

const TITIK = { info: "bg-sky-600", sukses: "bg-emerald-600", perhatian: "bg-amber-500", bahaya: "bg-red-600" };

/**
 * Kumpulan catatan dalam SATU kartu (bukan kotak bertumpuk).
 * `butir`: [{ jenis, judul, isi }]; butir yang kosong/false diabaikan.
 * Satu butir saja tampil sebagai pesan biasa.
 */
export function Catatan({ butir, judul = "Perlu diperhatikan" }) {
  const ada = (butir ?? []).filter(Boolean);
  if (ada.length === 0) return null;
  if (ada.length === 1) {
    const b = ada[0];
    return (
      <Pesan jenis={b.jenis} judul={b.judul}>
        {b.isi}
      </Pesan>
    );
  }
  return (
    <section aria-label={judul} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <h2 className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">
        {judul} · {ada.length}
      </h2>
      <ul className="divide-y divide-slate-100">
        {ada.map((b, i) => (
          <li key={i} className="flex items-start gap-3 px-3 py-2.5 text-sm leading-relaxed text-slate-800">
            <span aria-hidden className={`mt-2 h-2 w-2 shrink-0 rounded-full ${TITIK[b.jenis] ?? TITIK.info}`} />
            <p className="min-w-0">
              {b.judul && <b className="text-slate-950">{b.judul}. </b>}
              {b.isi}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function KosongPandu({ judul, teks, href, label, children }) {
  return (
    <div className="rounded-xl border border-dashed border-sky-300 bg-white px-6 py-8 text-center">
      <p className="text-lg font-bold text-sky-950">{judul}</p>
      {teks && <p className="mx-auto mt-2 max-w-xl text-sm text-slate-700">{teks}</p>}
      {href && (
        <Link href={href} className={`${tombol.utama} mt-5`}>
          {label}
        </Link>
      )}
      {children}
    </div>
  );
}

export function Kartu({ className = "", children }) {
  return <div className={`rounded-xl border border-sky-100 bg-white p-4 shadow-sm ${className}`}>{children}</div>;
}
