import Image from "next/image";
import Link from "next/link";
import GaleriGrid from "@/components/GaleriGrid";
import BannerHalaman from "@/components/BannerHalaman";
import { getGaleri } from "@/lib/galeri";
import { createClient } from "@/lib/supabase/server";

export default async function GaleriPublikPage() {
  const supabase = await createClient();
  const items = await getGaleri(supabase);

  return (
    <main className="bg-white">
      <BannerHalaman
        kunci="galeri"
        kecil="Dokumentasi"
        judul="Galeri Kegiatan Desa"
        deskripsi="Kumpulan foto kegiatan dan aktivitas desa, didokumentasikan langsung oleh perangkat desa."
      />

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
