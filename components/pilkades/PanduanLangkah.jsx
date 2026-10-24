import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ambilPeriode, ambilLangkah } from "@/lib/pilkades";
import { IconCheck } from "@/components/icons";
import { IconKunci, tombol } from "./UI";

// Warna ikon tiap langkah (class ditulis utuh agar terbaca Tailwind).
const WARNA_LANGKAH = [
  "bg-sky-100 text-sky-700",
  "bg-teal-100 text-teal-700",
  "bg-violet-100 text-violet-700",
  "bg-orange-100 text-orange-700",
  "bg-indigo-100 text-indigo-700",
  "bg-rose-100 text-rose-700",
];

const BULAT = {
  selesai: "bg-emerald-500 text-white",
  berjalan: "bg-amber-500 text-white",
  siap: "bg-sky-600 text-white",
  terkunci: "bg-slate-300 text-slate-600",
};

const LABEL = {
  selesai: ["✓ Selesai", "bg-emerald-100 text-emerald-800"],
  berjalan: ["● Sedang dikerjakan", "bg-amber-100 text-amber-800"],
  siap: ["Siap dikerjakan", "bg-sky-100 text-sky-800"],
  terkunci: ["Belum bisa", "bg-slate-100 text-slate-600"],
};

function Bulat({ no, status }) {
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-bold ${BULAT[status]}`}>
      {status === "selesai" ? <IconCheck className="h-5 w-5" /> : status === "terkunci" ? <IconKunci className="h-4 w-4" /> : no}
    </span>
  );
}

/** Tampilan murni (tanpa query): dipakai dashboard (lengkap) dan bilah di tiap halaman (ringkas). */
export function DaftarLangkah({ langkah, aktif, varian = "ringkas" }) {
  if (varian === "lengkap") {
    return (
      <ol className="space-y-3">
        {langkah.map((l, i) => {
          const kunci = l.status === "terkunci";
          return (
            <li
              key={l.kunci}
              className={`flex flex-wrap items-center gap-4 rounded-2xl border-2 bg-white p-4 ${
                kunci ? "border-slate-200" : l.status === "selesai" ? "border-emerald-200" : "border-sky-200"
              }`}
            >
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-extrabold ${WARNA_LANGKAH[i]}`}>
                {l.no}
              </span>
              <div className="min-w-0 flex-1 basis-60">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-bold text-slate-900">{l.judul}</p>
                  <span className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${LABEL[l.status][1]}`}>
                    {l.status === "terkunci" ? "🔒 Belum bisa" : LABEL[l.status][0]}
                  </span>
                </div>
                <p className="mt-0.5 text-base text-slate-700">{l.penjelasan}</p>
                <p className="mt-0.5 text-sm font-medium text-slate-500">{l.ket}</p>
              </div>
              {kunci ? null : (
                <Link href={l.href} className={l.status === "selesai" ? tombol.sekunder : tombol.utama}>
                  {l.status === "selesai" ? "Lihat" : "Kerjakan"}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <nav aria-label="Alur kerja Pilkades">
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {langkah.map((l) => {
          const isi = (
            <>
              <Bulat no={l.no} status={l.status} />
              <span className="min-w-0">
                <span className="block truncate text-base font-bold text-slate-900">{l.pendek}</span>
                <span className="block text-sm text-slate-600">
                  {l.status === "terkunci" ? "Belum bisa" : LABEL[l.status][0].replace("● ", "")}
                </span>
              </span>
            </>
          );
          const ring = aktif === l.kunci ? "border-sky-500 ring-4 ring-sky-100" : "border-sky-100";
          return (
            <li key={l.kunci}>
              {l.status === "terkunci" ? (
                <div title={l.ket} className={`flex items-center gap-2 rounded-xl border-2 bg-slate-50 p-2.5 opacity-80 ${ring}`}>
                  {isi}
                </div>
              ) : (
                <Link href={l.href} className={`flex items-center gap-2 rounded-xl border-2 bg-white p-2.5 transition hover:border-sky-400 ${ring}`}>
                  {isi}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Bilah langkah untuk ditaruh di atas setiap halaman Pilkades. */
export default async function PanduanLangkah({ aktif }) {
  const supabase = await createClient();
  const periode = await ambilPeriode(supabase);
  if (!periode) return null;
  const s = await ambilLangkah(supabase, periode);
  return <DaftarLangkah langkah={s.langkah} aktif={aktif} />;
}
