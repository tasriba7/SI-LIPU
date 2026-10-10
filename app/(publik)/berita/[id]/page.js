import Link from "next/link";
import { notFound } from "next/navigation";
import KartuBerita from "@/components/KartuBerita";
import { getBeritaById, getBeritaLainnya, labelKategoriBerita, tanggalIndo } from "@/lib/berita";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const b = await getBeritaById(supabase, id);
  return { title: b?.terbit ? `${b.judul} — Berita Desa` : "Berita Desa" };
}

export default async function DetailBeritaPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const b = await getBeritaById(supabase, id);
  if (!b || !b.terbit) notFound();

  const lainnya = await getBeritaLainnya(supabase, b.id, 3);
  const paragraf = (b.isi || "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <main className="bg-white pb-16">
      <article className="mx-auto max-w-3xl px-6 pt-10">
        <Link href="/berita" className="text-sm text-slate-400 hover:text-navy">
          &larr; Semua berita
        </Link>

        <div className="mt-5 flex flex-wrap items-center gap-3 text-xs">
          <span className="rounded-full bg-navy px-3 py-1 font-medium text-white">
            {labelKategoriBerita(b.kategori)}
          </span>
          <span className="text-slate-400">{tanggalIndo(b.tanggal_terbit)}</span>
        </div>
        <h1 className="mt-4 font-display text-3xl font-bold leading-tight text-navy sm:text-4xl">{b.judul}</h1>

        {b.foto_url && (
          <div className="mt-6 overflow-hidden rounded-2xl bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.foto_url} alt={b.judul} className="max-h-[28rem] w-full object-cover" />
          </div>
        )}

        <div className="mt-8 space-y-5">
          {paragraf.map((p, i) => (
            <p key={i} className="whitespace-pre-line text-base leading-[1.85] text-slate-700">
              {p}
            </p>
          ))}
        </div>
      </article>

      {lainnya.length > 0 && (
        <section className="mx-auto mt-16 max-w-6xl border-t border-slate-100 px-6 pt-12">
          <h2 className="font-display text-xl font-semibold text-navy">Berita lainnya</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {lainnya.map((item) => (
              <KartuBerita key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
