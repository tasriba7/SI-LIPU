import BannerHalaman from "@/components/BannerHalaman";
import SectionHeading from "@/components/SectionHeading";
import {
  AtribusiBmkg,
  DaftarGempa,
  KartuCuacaSekarang,
  KartuGempaUtama,
  PesanBmkg,
  PesanCuacaTidakAda,
  PrakiraanPerHari,
} from "@/components/BmkgKomponen";
import { getConfigDesa } from "@/lib/configDesa";
import { getCuacaDesa, getDataGempa } from "@/lib/bmkg";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Cuaca & Gempa" };

const chip =
  "rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-600 transition hover:border-gold hover:text-navy";

export default async function CuacaPublikPage() {
  const supabase = await createClient();
  const config = await getConfigDesa(supabase);

  // Data BMKG di-cache di lib/bmkg.js, jadi aman dibuka banyak warga sekaligus.
  const [cuaca, gempa] = await Promise.all([getCuacaDesa(config), getDataGempa()]);

  const cuacaAda = cuaca.status === "ok";
  const titikDesa = cuacaAda ? { lat: cuaca.lokasi.lat, lon: cuaca.lokasi.lon } : null;

  return (
    <main className="bg-white">
      <BannerHalaman
        kunci="cuaca"
        kecil="Info BMKG"
        judul="Cuaca & Gempa"
        deskripsi="Prakiraan cuaca wilayah desa dan informasi gempa bumi terkini dari BMKG."
      />

      <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <nav aria-label="Lompat ke bagian" className="mb-10 flex flex-wrap gap-2">
          <a href="#cuaca" className={chip}>Cuaca</a>
          <a href="#gempa-terbaru" className={chip}>Gempa terbaru</a>
          <a href="#gempa-m5" className={chip}>Gempa M 5,0+</a>
          <a href="#gempa-dirasakan" className={chip}>Gempa dirasakan</a>
        </nav>

        {/* Cuaca */}
        <section id="cuaca" className="scroll-mt-24">
          <SectionHeading
            kecil="Prakiraan"
            judul="Cuaca di wilayah desa"
            deskripsi="Prakiraan per 3 jam untuk beberapa hari ke depan."
          />
          <div className="mt-8 space-y-8">
            {cuacaAda ? (
              <>
                <KartuCuacaSekarang cuaca={cuaca} />
                <PrakiraanPerHari hari={cuaca.perHari} zona={cuaca.lokasi.zona} />
              </>
            ) : (
              <PesanCuacaTidakAda status={cuaca.status} />
            )}
          </div>
        </section>

        {/* Gempa terbaru */}
        <section id="gempa-terbaru" className="mt-16 scroll-mt-24">
          <SectionHeading
            kecil="Kegempaan"
            judul="Gempa bumi terbaru"
            deskripsi="Kejadian gempa bumi terakhir yang tercatat BMKG di seluruh Indonesia."
          />
          <div className="mt-8">
            {gempa.terbaru ? (
              <KartuGempaUtama gempa={gempa.terbaru} titikDesa={titikDesa} />
            ) : (
              <PesanBmkg
                judul="Data gempa terbaru sedang tidak dapat ditampilkan"
                teks="Silakan coba lagi beberapa saat lagi."
              />
            )}
          </div>
        </section>

        {/* Gempa M 5,0+ */}
        <section id="gempa-m5" className="mt-16 scroll-mt-24">
          <SectionHeading
            kecil="Kegempaan"
            judul="Gempa magnitudo 5,0 atau lebih"
            deskripsi="Lima belas kejadian terakhir dengan magnitudo 5,0 ke atas."
          />
          <div className="mt-8">
            <DaftarGempa
              items={gempa.m5}
              titikDesa={titikDesa}
              kosong="Data gempa M 5,0+ sedang tidak dapat ditampilkan"
            />
          </div>
        </section>

        {/* Gempa dirasakan */}
        <section id="gempa-dirasakan" className="mt-16 scroll-mt-24">
          <SectionHeading
            kecil="Kegempaan"
            judul="Gempa yang dirasakan"
            deskripsi="Lima belas kejadian terakhir yang dirasakan masyarakat, lengkap dengan wilayah yang merasakannya."
          />
          <div className="mt-8">
            <DaftarGempa
              items={gempa.dirasakan}
              titikDesa={titikDesa}
              tampilkanDirasakan
              kosong="Data gempa dirasakan sedang tidak dapat ditampilkan"
            />
          </div>
        </section>

        <div className="mt-14 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-5 py-4 text-center">
          <AtribusiBmkg />
          <p className="mt-1 text-xs text-slate-400">
            Untuk peringatan dini dan keputusan penting, ikuti arahan resmi BMKG dan BPBD setempat.
          </p>
        </div>
      </div>
    </main>
  );
}
