import Link from "next/link";
import FormPencarianSitus from "@/components/FormPencarianSitus";
import SorotKata from "@/components/SorotKata";
import { createClient } from "@/lib/supabase/server";
import { cariSitus, MIN_HURUF } from "@/lib/pencarian";

// Halaman hasil pencarian: jangan diindeks mesin pencari (isinya bergantung
// pada kata kunci pengunjung, bukan konten tetap).
export const metadata = { title: "Pencarian", robots: { index: false, follow: true } };

const KELOMPOK = [
  { kunci: "pengumuman", judul: "Pengumuman" },
  { kunci: "berita", judul: "Berita" },
  { kunci: "layanan", judul: "Layanan" },
  { kunci: "wisata", judul: "Wisata" },
  { kunci: "profil", judul: "Profil Desa" },
  { kunci: "halaman", judul: "Halaman" },
];

const TAUTAN_SARAN = [
  { href: "/berita", label: "Berita Desa" },
  { href: "/layanan", label: "Panel Warga" },
  { href: "/profil", label: "Profil Desa" },
  { href: "/wisata", label: "Wisata" },
];

export default async function CariPage({ searchParams }) {
  const sp = await searchParams;
  const mentah = Array.isArray(sp?.q) ? sp.q[0] : sp?.q;
  const supabase = await createClient();
  const hasil = await cariSitus(supabase, typeof mentah === "string" ? mentah : "");

  const adaKata = hasil.q.length > 0;
  const kelompokAda = KELOMPOK.filter((k) => hasil[k.kunci].length > 0);

  return (
    <main>
      <section className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        <h1 className="font-display text-3xl font-bold text-navy-dark sm:text-4xl">Pencarian</h1>
        <span aria-hidden className="garis-aksen mt-4 block" />

        <FormPencarianSitus nilaiAwal={hasil.q} ukuran="besar" className="mt-6" autoFocus={!adaKata} />

        {!adaKata && (
          <div className="mt-10 rounded-2xl border border-dashed border-slate-300 px-4 py-12 text-center">
            <p className="text-sm text-slate-500">
              Ketik kata kunci untuk mencari berita, pengumuman, layanan, wisata, atau profil desa.
            </p>
          </div>
        )}

        {adaKata && hasil.terlaluPendek && (
          <div className="mt-10 rounded-2xl border border-dashed border-slate-300 px-4 py-12 text-center">
            <p className="text-sm text-slate-500">
              Kata kunci terlalu pendek. Ketik minimal {MIN_HURUF} huruf atau angka.
            </p>
          </div>
        )}

        {adaKata && !hasil.terlaluPendek && hasil.total === 0 && (
          <div className="mt-10 rounded-2xl border border-dashed border-slate-300 px-4 py-12 text-center">
            <p className="text-sm text-slate-600">
              Tidak ada hasil untuk <strong className="text-slate-800">“{hasil.q}”</strong>.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Coba kata kunci lain yang lebih umum, atau buka salah satu halaman berikut:
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {TAUTAN_SARAN.map((t) => (
                <Link
                  key={t.href}
                  href={t.href}
                  className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-600 transition hover:border-gold hover:text-navy"
                >
                  {t.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {adaKata && !hasil.terlaluPendek && hasil.total > 0 && (
          <>
            <p className="mt-8 text-sm text-slate-500" role="status">
              {hasil.total} hasil untuk <strong className="text-slate-800">“{hasil.q}”</strong>
            </p>

            <div className="mt-6 space-y-10">
              {kelompokAda.map((k) => (
                <section key={k.kunci} aria-labelledby={`hasil-${k.kunci}`}>
                  <h2
                    id={`hasil-${k.kunci}`}
                    className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-navy"
                  >
                    {k.judul} ({hasil[k.kunci].length})
                  </h2>
                  <ul className="mt-3 space-y-3">
                    {hasil[k.kunci].map((item) => (
                      <li key={`${k.kunci}-${item.href}-${item.judul}`}>
                        <Link
                          href={item.href}
                          className="block rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm transition hover:border-gold hover:shadow-md"
                        >
                          <span className="block font-display text-base font-semibold text-navy-dark">
                            <SorotKata teks={item.judul} kata={hasil.kata} />
                          </span>
                          {item.meta && (
                            <span className="mt-0.5 block text-xs text-slate-400">{item.meta}</span>
                          )}
                          {item.cuplikan && (
                            <span className="mt-2 block text-sm leading-relaxed text-slate-600">
                              <SorotKata teks={item.cuplikan} kata={hasil.kata} />
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
