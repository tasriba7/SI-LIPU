import Link from "next/link";
import BannerHalaman from "@/components/BannerHalaman";
import KartuBerita from "@/components/KartuBerita";
import { getBeritaTerbit, getKategoriBeritaAda, KATEGORI_BERITA } from "@/lib/berita";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Berita Desa" };

const PER_HALAMAN = 9;

export default async function BeritaPublikPage({ searchParams }) {
  const sp = await searchParams;
  const supabase = await createClient();

  const hitung = await getKategoriBeritaAda(supabase);
  const kategoriAda = KATEGORI_BERITA.filter((k) => hitung[k.nilai]);
  const total = Object.values(hitung).reduce((a, b) => a + b, 0);
  const kategori = kategoriAda.some((k) => k.nilai === sp?.kategori) ? sp.kategori : null;
  const halaman = Math.max(1, parseInt(sp?.halaman, 10) || 1);

  const { items, total: jumlah } = await getBeritaTerbit(supabase, {
    kategori,
    halaman,
    perHalaman: PER_HALAMAN,
  });
  const totalHalaman = Math.max(1, Math.ceil(jumlah / PER_HALAMAN));

  const href = (h) => {
    const p = new URLSearchParams();
    if (kategori) p.set("kategori", kategori);
    if (h > 1) p.set("halaman", String(h));
    const q = p.toString();
    return q ? `/berita?${q}` : "/berita";
  };
  const chip = (aktif) =>
    `rounded-full border px-4 py-1.5 text-sm font-medium transition ${
      aktif ? "border-navy bg-navy text-white" : "border-slate-200 bg-white text-slate-600 hover:border-gold hover:text-navy"
    }`;
  const tombolHal =
    "rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:border-gold hover:text-navy";

  return (
    <main className="bg-white">
      <BannerHalaman
        kunci="berita"
        kecil="Kabar Desa"
        judul="Berita Desa"
        deskripsi="Informasi, kegiatan, dan perkembangan terkini dari pemerintah desa."
      />

      <section className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        {total === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-16 text-center">
            <p className="text-sm text-slate-400">Belum ada berita. Silakan kembali lagi nanti.</p>
          </div>
        ) : (
          <>
            {kategoriAda.length > 1 && (
              <div className="mb-8 flex flex-wrap gap-2">
                <Link href="/berita" className={chip(!kategori)}>
                  Semua ({total})
                </Link>
                {kategoriAda.map((k) => (
                  <Link key={k.nilai} href={`/berita?kategori=${k.nilai}`} className={chip(kategori === k.nilai)}>
                    {k.label} ({hitung[k.nilai]})
                  </Link>
                ))}
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <KartuBerita key={item.id} item={item} />
              ))}
            </div>

            {totalHalaman > 1 && (
              <nav aria-label="Halaman berita" className="mt-10 flex items-center justify-between gap-4">
                {halaman > 1 ? (
                  <Link href={href(halaman - 1)} className={tombolHal}>
                    &larr; Lebih baru
                  </Link>
                ) : (
                  <span />
                )}
                <span className="text-xs text-slate-400">
                  Halaman {halaman} dari {totalHalaman}
                </span>
                {halaman < totalHalaman ? (
                  <Link href={href(halaman + 1)} className={tombolHal}>
                    Lebih lama &rarr;
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            )}
          </>
        )}
      </section>
    </main>
  );
}
