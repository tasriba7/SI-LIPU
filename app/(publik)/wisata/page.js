import Link from "next/link";
import BannerHalaman from "@/components/BannerHalaman";
import KartuWisata from "@/components/KartuWisata";
import { getWisata, KATEGORI_WISATA } from "@/lib/wisata";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Wisata Desa" };

export default async function WisataPublikPage({ searchParams }) {
  const { kategori } = await searchParams;
  const supabase = await createClient();
  const semua = await getWisata(supabase);

  // Chip filter hanya untuk kategori yang benar-benar punya isi, supaya
  // warga tidak klik kategori kosong.
  const hitung = {};
  for (const w of semua) hitung[w.kategori] = (hitung[w.kategori] || 0) + 1;
  const kategoriAda = KATEGORI_WISATA.filter((k) => hitung[k.nilai]);
  const dipilih = kategoriAda.some((k) => k.nilai === kategori) ? kategori : null;
  const tampil = dipilih ? semua.filter((w) => w.kategori === dipilih) : semua;

  const chip = (aktif) =>
    `rounded-full border px-4 py-1.5 text-sm font-medium transition ${
      aktif
        ? "border-navy bg-navy text-white"
        : "border-slate-200 bg-white text-slate-600 hover:border-gold hover:text-navy"
    }`;

  return (
    <main className="bg-white">
      <BannerHalaman
        kunci="wisata"
        kecil="Jelajahi Desa"
        judul="Wisata Desa"
        deskripsi="Destinasi menarik di desa kami — alam, budaya, kuliner, dan lainnya."
      />

      <section className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        {semua.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-16 text-center">
            <p className="text-sm text-slate-400">
              Data wisata sedang disiapkan oleh perangkat desa. Silakan kembali lagi nanti.
            </p>
          </div>
        ) : (
          <>
            {kategoriAda.length > 1 && (
              <div className="mb-8 flex flex-wrap gap-2">
                <Link href="/wisata" className={chip(!dipilih)}>
                  Semua ({semua.length})
                </Link>
                {kategoriAda.map((k) => (
                  <Link key={k.nilai} href={`/wisata?kategori=${k.nilai}`} className={chip(dipilih === k.nilai)}>
                    {k.label} ({hitung[k.nilai]})
                  </Link>
                ))}
              </div>
            )}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {tampil.map((item) => (
                <KartuWisata key={item.id} item={item} />
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
