import Image from "next/image";
import Link from "next/link";
import GaleriGrid from "@/components/GaleriGrid";
import { getGaleri } from "@/lib/galeri";
import { createClient } from "@/lib/supabase/server";

export default async function GaleriPublikPage() {
  const supabase = await createClient();
  const items = await getGaleri(supabase);

  return (
    <main className="bg-white">
      <section className="border-b border-slate-100 bg-navy-dark">
        <div className="mx-auto max-w-6xl px-6 py-14 text-center md:py-20">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-gold">
            Dokumentasi
          </p>
          <h1 className="mx-auto mt-3 max-w-2xl font-display text-3xl font-bold text-white sm:text-4xl">
            Galeri Kegiatan Desa
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
            Kumpulan foto kegiatan dan aktivitas desa, didokumentasikan
            langsung oleh perangkat desa.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <GaleriGrid items={items} />
      </section>

      <footer className="border-t border-slate-100">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-center gap-2.5">
            <Image
              src="/logo-si-lipu.png"
              alt="Logo SI-LIPU"
              width={22}
              height={22}
            />
            <span className="text-xs text-slate-400">
              SI-LIPU — Sistem Informasi Layanan Interaktif Pelayanan Umum
            </span>
          </div>
          <Link
            href="/"
            className="text-xs text-slate-400 underline hover:text-slate-600"
          >
            Kembali ke beranda
          </Link>
        </div>
      </footer>
    </main>
  );
}
