import Link from "next/link";
import { notFound } from "next/navigation";
import { IconMapPin, IconClock, IconMessage } from "@/components/icons";
import { getWisataById, labelKategori } from "@/lib/wisata";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const w = await getWisataById(supabase, id);
  return { title: w ? `${w.nama} — Wisata Desa` : "Wisata Desa" };
}

function Info({ icon: Icon, label, children }) {
  if (!children) return null;
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy/5 text-navy">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-sm text-slate-700">{children}</p>
      </div>
    </div>
  );
}

export default async function DetailWisataPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const w = await getWisataById(supabase, id);
  // Publik tidak bisa membuka wisata nonaktif (RLS), jadi cukup cek keberadaan.
  if (!w || !w.aktif) notFound();

  const paragraf = (w.deskripsi || "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <main className="bg-white pb-16">
      <div className="relative h-64 overflow-hidden bg-navy-dark sm:h-80 md:h-[26rem]">
        {w.foto_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={w.foto_url} alt={w.nama} className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-navy-dark/90 via-navy-dark/30 to-transparent" />
        <div className="relative mx-auto flex h-full max-w-5xl flex-col justify-end px-6 pb-8">
          <span className="w-fit rounded-full bg-gold px-3 py-1 text-xs font-semibold text-navy-dark">
            {labelKategori(w.kategori)}
          </span>
          <h1 className="mt-3 font-display text-3xl font-bold text-white drop-shadow-md sm:text-5xl">
            {w.nama}
          </h1>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-gold via-gold-light to-gold" />
      </div>

      <div className="mx-auto mt-8 max-w-5xl px-6">
        <Link href="/wisata" className="text-sm text-slate-400 hover:text-navy">
          &larr; Semua wisata
        </Link>

        <div className="mt-6 grid gap-8 md:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            {paragraf.length > 0 ? (
              paragraf.map((p, i) => (
                <p key={i} className="whitespace-pre-line text-base leading-relaxed text-slate-600">
                  {p}
                </p>
              ))
            ) : (
              <p className="text-sm text-slate-400">Deskripsi belum diisi.</p>
            )}
          </div>

          <aside className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <Info icon={IconMapPin} label="Lokasi">{w.lokasi}</Info>
            <Info icon={IconClock} label="Jam buka">{w.jam_buka}</Info>
            <Info icon={IconMessage} label="Tiket">{w.tiket}</Info>
            <Info icon={IconMessage} label="Kontak pengelola">{w.kontak}</Info>
            {w.maps_url && (
              <a
                href={w.maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-medium text-white transition hover:bg-navy-light"
              >
                <IconMapPin className="h-4 w-4" />
                Buka di Google Maps
              </a>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
