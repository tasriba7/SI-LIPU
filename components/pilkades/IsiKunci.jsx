import Link from "next/link";
import { IconKunci } from "./UI";

// Isi pesan "tahap terkunci". Tanpa hook, jadi bisa dipakai di jendela pesan
// (komponen klien) maupun di halaman (komponen server).
export default function IsiKunci({ kunci, onPilih }) {
  return (
    <div>
      <div className="flex items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <IconKunci className="h-8 w-8" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Tahap ini belum bisa dibuka</p>
          <h2 className="mt-0.5 text-xl font-bold text-slate-900">{kunci.nama}</h2>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-slate-800">{kunci.pesan}</p>

      {kunci.tambahan && (
        <p className="mt-3 rounded-lg border-l-4 border-sky-500 bg-sky-50 px-3 py-2 text-sm leading-relaxed text-sky-950">
          {kunci.tambahan}
        </p>
      )}

      {kunci.syarat?.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-bold text-slate-900">Yang perlu diselesaikan lebih dulu</p>
          <ul className="mt-2 space-y-1.5">
            {kunci.syarat.map((s, i) => {
              const giliran = i === kunci.urutanPertama;
              return (
                <li
                  key={i}
                  className={`flex items-start gap-2.5 rounded-lg px-3 py-2 text-sm ${
                    s.ok ? "bg-emerald-50 text-emerald-900" : giliran ? "bg-amber-50 font-semibold text-amber-950 ring-1 ring-amber-300" : "bg-slate-50 text-slate-600"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                      s.ok ? "bg-emerald-600" : giliran ? "bg-amber-500" : "bg-slate-400"
                    }`}
                  >
                    {s.ok ? "✓" : giliran ? "!" : i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    {s.teks}
                    {s.ok && <span className="sr-only"> (sudah selesai)</span>}
                    {giliran && <span className="mt-0.5 block text-xs font-bold text-amber-800">Mulai dari sini</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {kunci.aksi && (
        <Link
          href={kunci.aksi.href}
          onClick={onPilih}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 sm:w-auto"
        >
          {kunci.aksi.label} →
        </Link>
      )}
    </div>
  );
}
