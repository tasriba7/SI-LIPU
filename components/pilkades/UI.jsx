import Link from "next/link";

/* Gaya bersama modul Pilkades: huruf besar (16px+), kontras tinggi, warna cerah.
 * Aturan: hanya SATU tombol utama (biru) per halaman. */

const dasar =
  "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-semibold transition focus:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50";

export const tombol = {
  utama: `${dasar} bg-sky-600 text-white shadow-sm hover:bg-sky-700 focus-visible:ring-sky-300`,
  sekunder: `${dasar} border-2 border-sky-200 bg-white text-sky-800 hover:bg-sky-50 focus-visible:ring-sky-200`,
  hijau: `${dasar} bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus-visible:ring-emerald-300`,
  bahaya: `${dasar} bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-300`,
  kecil: "inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300",
};

export const kolom =
  "w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 disabled:bg-slate-100";

export const kolomKecil =
  "rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-base text-slate-900 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100 disabled:bg-slate-100";

export const labelKolom = "mb-1 block text-base font-semibold text-slate-800";

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
        <p className="text-sm font-bold uppercase tracking-wide text-sky-700">Langkah {langkah} dari 6</p>
      )}
      <h1 className="mt-1 text-2xl font-extrabold text-sky-950 md:text-3xl">{judul}</h1>
      {penjelasan && <p className="mt-2 max-w-3xl text-base leading-relaxed text-slate-700">{penjelasan}</p>}
    </div>
  );
}

const GAYA_PESAN = {
  info: ["border-sky-300 bg-sky-50 text-sky-950", "bg-sky-600", "i"],
  sukses: ["border-emerald-300 bg-emerald-50 text-emerald-950", "bg-emerald-600", "✓"],
  perhatian: ["border-amber-300 bg-amber-50 text-amber-950", "bg-amber-500", "!"],
  bahaya: ["border-red-300 bg-red-50 text-red-950", "bg-red-600", "!"],
};

export function Pesan({ jenis = "info", judul, children }) {
  const [kotak, bulat, simbol] = GAYA_PESAN[jenis] ?? GAYA_PESAN.info;
  return (
    <div role={jenis === "bahaya" ? "alert" : "status"} className={`flex gap-3 rounded-2xl border-2 p-4 ${kotak}`}>
      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${bulat}`}>
        {simbol}
      </span>
      <div className="min-w-0 text-base leading-relaxed">
        {judul && <p className="font-bold">{judul}</p>}
        <div className={judul ? "mt-1" : ""}>{children}</div>
      </div>
    </div>
  );
}

export function KosongPandu({ judul, teks, href, label, children }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-sky-300 bg-white px-6 py-10 text-center">
      <p className="text-xl font-bold text-sky-950">{judul}</p>
      {teks && <p className="mx-auto mt-2 max-w-xl text-base text-slate-700">{teks}</p>}
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
  return <div className={`rounded-2xl border-2 border-sky-100 bg-white p-5 shadow-sm ${className}`}>{children}</div>;
}
