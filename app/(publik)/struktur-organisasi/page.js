import BannerHalaman from "@/components/BannerHalaman";
import BaganStruktur from "@/components/BaganStruktur";
import { getStrukturPublik } from "@/lib/strukturOrganisasi";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Struktur Organisasi" };

export default async function StrukturOrganisasiPage() {
  const supabase = await createClient();
  const pohon = await getStrukturPublik(supabase);

  return (
    <main className="bg-gradient-to-b from-white via-royal-pale/60 to-white">
      <BannerHalaman
        kunci="struktur"
        kecil="Pemerintahan Desa"
        judul="Struktur Organisasi"
        deskripsi="Susunan perangkat desa beserta jabatannya, dari Kepala Desa hingga jajaran di bawahnya."
      />

      <section className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        {pohon.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-16 text-center">
            <p className="text-sm text-slate-400">
              Struktur organisasi sedang disiapkan oleh perangkat desa. Silakan kembali lagi nanti.
            </p>
          </div>
        ) : (
          <BaganStruktur pohon={pohon} />
        )}
      </section>
    </main>
  );
}
