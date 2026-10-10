import Image from "next/image";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import BannerHalaman from "@/components/BannerHalaman";
import AuroraBackground from "@/components/AuroraBackground";
import { getConfigDesa, labelWilayah } from "@/lib/configDesa";
import { getProfilDesa, pecahMisi } from "@/lib/profilDesa";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Profil Desa" };

function Judul({ kecil, besar }) {
  return (
    <>
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-seablue">{kecil}</p>
      <h2 className="mt-3 font-display text-2xl font-semibold text-navy sm:text-3xl">{besar}</h2>
    </>
  );
}

export default async function ProfilDesaPage() {
  const supabase = await createClient();
  const [config, { profil }] = await Promise.all([
    getConfigDesa(supabase),
    getProfilDesa(supabase),
  ]);

  const jenis = config.jenis_wilayah || "Desa";
  const namaLengkap = config.nama_desa ? `${jenis} ${config.nama_desa}` : "Profil Desa";
  const wilayah = labelWilayah(config);
  const misi = pecahMisi(profil.profil_misi);
  const paragrafSejarah = profil.profil_sejarah
    ? profil.profil_sejarah.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    : [];

  const batas = [
    ["Utara", profil.batas_utara],
    ["Timur", profil.batas_timur],
    ["Selatan", profil.batas_selatan],
    ["Barat", profil.batas_barat],
  ].filter(([, nilai]) => nilai);

  const adaSejarah = paragrafSejarah.length > 0;
  const adaVisiMisi = Boolean(profil.profil_visi) || misi.length > 0;
  const adaWilayah = Boolean(profil.luas_wilayah) || batas.length > 0 || Boolean(config.alamat);
  const adaPimpinan = Boolean(config.kepala_desa_nama);
  const kosong = !adaSejarah && !adaVisiMisi && !adaWilayah && !adaPimpinan;
  const jabatanKepala = jenis === "Kelurahan" ? "Lurah" : "Kepala Desa";

  return (
    <main className="overflow-x-clip bg-white">
      <BannerHalaman
        kunci="profil"
        kecil={`Profil ${jenis}`}
        judul={namaLengkap}
        deskripsi={wilayah}
      />

      <AuroraBackground>
        {kosong && (
          <section className="mx-auto max-w-2xl px-6 py-24 text-center">
            <Reveal>
              <h2 className="font-display text-xl font-semibold text-navy">
                Profil belum diisi
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                Informasi sejarah, visi-misi, dan wilayah {jenis.toLowerCase()} ini sedang
                disiapkan oleh perangkat desa. Silakan kembali lagi nanti.
              </p>
            </Reveal>
          </section>
        )}

        {adaSejarah && (
          <section className="mx-auto max-w-4xl px-6 py-16 md:py-20">
            <Reveal>
              <Judul kecil="Asal-usul" besar={`Sejarah ${namaLengkap}`} />
            </Reveal>
            <div className="mt-8 space-y-5">
              {paragrafSejarah.map((p, i) => (
                <Reveal key={i} delay={i === 0 ? 0 : 80}>
                  <p className="text-base leading-relaxed text-slate-600 sm:text-lg">{p}</p>
                </Reveal>
              ))}
            </div>
          </section>
        )}

        {adaVisiMisi && (
          <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
            <Reveal>
              <Judul kecil="Arah Pembangunan" besar="Visi & Misi" />
            </Reveal>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {profil.profil_visi && (
                <Reveal variant="left" className="h-full">
                  <div className="h-full rounded-3xl bg-navy p-8 text-white shadow-sm">
                    <p className="font-mono text-xs uppercase tracking-[0.25em] text-gold">Visi</p>
                    <p className="mt-4 font-display text-xl leading-snug sm:text-2xl">
                      {profil.profil_visi}
                    </p>
                  </div>
                </Reveal>
              )}
              {misi.length > 0 && (
                <Reveal variant="right" className="h-full">
                  <div className="h-full rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-sm">
                    <p className="font-mono text-xs uppercase tracking-[0.25em] text-seablue">Misi</p>
                    <ol className="mt-4 space-y-3">
                      {misi.map((m, i) => (
                        <li key={i} className="flex gap-3 text-sm leading-relaxed text-slate-600 sm:text-base">
                          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/20 text-xs font-semibold text-navy">
                            {i + 1}
                          </span>
                          <span>{m}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </Reveal>
              )}
            </div>
          </section>
        )}

        {adaWilayah && (
          <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
            <Reveal>
              <Judul kecil="Geografis" besar="Wilayah" />
            </Reveal>

            {(profil.luas_wilayah || config.alamat) && (
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {profil.luas_wilayah && (
                  <Reveal variant="zoom" className="h-full">
                    <div className="h-full rounded-2xl border border-gold/40 bg-white/80 p-6">
                      <p className="text-xs uppercase tracking-wider text-slate-400">Luas wilayah</p>
                      <p className="mt-1 font-display text-2xl font-semibold text-navy">
                        {profil.luas_wilayah}
                      </p>
                    </div>
                  </Reveal>
                )}
                {config.alamat && (
                  <Reveal variant="zoom" delay={120} className="h-full">
                    <div className="h-full rounded-2xl border border-slate-200 bg-white/80 p-6">
                      <p className="text-xs uppercase tracking-wider text-slate-400">Alamat kantor</p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">{config.alamat}</p>
                    </div>
                  </Reveal>
                )}
              </div>
            )}

            {batas.length > 0 && (
              <>
                <Reveal>
                  <h3 className="mt-10 text-sm font-semibold text-slate-700">Batas wilayah</h3>
                </Reveal>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {batas.map(([arah, nilai], i) => (
                    <Reveal key={arah} delay={i * 100} className="h-full">
                      <div className="h-full rounded-2xl border border-slate-200/70 bg-white/70 p-5 transition duration-300 hover:-translate-y-1 hover:border-gold/60 hover:shadow-lg hover:shadow-navy/10">
                        <p className="font-mono text-xs uppercase tracking-[0.2em] text-seablue">
                          {arah}
                        </p>
                        <p className="mt-2 text-sm font-medium text-slate-700">{nilai}</p>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {adaPimpinan && (
          <section className="mx-auto max-w-4xl px-6 py-16 md:py-20">
            <Reveal variant="zoom">
              <div className="flex flex-col items-center gap-6 rounded-3xl border border-slate-200 bg-white/80 p-8 text-center shadow-sm sm:flex-row sm:text-left">
                {config.kepala_desa_foto_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={config.kepala_desa_foto_url}
                    alt={config.kepala_desa_nama}
                    className="h-28 w-28 shrink-0 rounded-full border-4 border-gold-light/70 object-cover shadow-lg"
                  />
                ) : (
                  <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-4 border-gold-light/70 bg-navy font-display text-4xl font-semibold text-gold-light shadow-lg">
                    {config.kepala_desa_nama.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.25em] text-seablue">
                    Pimpinan
                  </p>
                  <p className="mt-2 font-display text-xl font-semibold text-navy">
                    {config.kepala_desa_nama}
                  </p>
                  <p className="text-sm text-slate-500">
                    {jabatanKepala}
                    {config.nama_desa ? ` ${config.nama_desa}` : ""}
                  </p>
                  {config.kepala_desa_sambutan && (
                    <Link href="/" className="mt-3 inline-block text-sm font-medium text-navy underline">
                      Baca kata sambutan
                    </Link>
                  )}
                </div>
              </div>
            </Reveal>
          </section>
        )}
      </AuroraBackground>

      <footer className="border-t border-slate-100">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-center gap-2.5">
            <Image src="/logo-si-lipu.png" alt="Logo SI-LIPU" width={22} height={22} />
            <span className="text-xs text-slate-400">
              SI-LIPU — Sistem Informasi Layanan Interaktif Pelayanan Umum
            </span>
          </div>
          <Link href="/" className="text-xs text-slate-400 underline hover:text-slate-600">
            Kembali ke beranda
          </Link>
        </div>
      </footer>
    </main>
  );
}
