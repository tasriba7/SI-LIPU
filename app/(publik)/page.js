import { Suspense } from "react";
import Link from "next/link";
import VillageSeal from "@/components/VillageSeal";
import StatBerandaCards from "@/components/StatBerandaCards";
import StatistikDetailBeranda from "@/components/StatistikDetailBeranda";
import Reveal from "@/components/Reveal";
import AuroraBackground from "@/components/AuroraBackground";
import GaleriBeranda from "@/components/GaleriBeranda";
import WisataBeranda from "@/components/WisataBeranda";
import BeritaBeranda from "@/components/BeritaBeranda";
import BmkgBeranda from "@/components/BmkgBeranda";
import StrukturBeranda from "@/components/StrukturBeranda";
import ApbdesBeranda from "@/components/ApbdesBeranda";
import JamTanggalBeranda from "@/components/JamTanggalBeranda";
import SpotlightCard from "@/components/SpotlightCard";
import SectionHeading from "@/components/SectionHeading";
import WaveDivider from "@/components/WaveDivider";
import PublicFooter from "@/components/PublicFooter";
import { getPengunjung } from "@/lib/pengunjung";
import JedaAnimasiDiluarLayar from "@/components/JedaAnimasiDiluarLayar";
import {
  IconMail,
  IconMegaphone,
  IconUsers,
  IconCheck,
  IconArrowRight,
  IconHeartHandshake,
  IconIdCard,
  IconSparkle,
  IconMapPin,
} from "@/components/icons";
import {
  getStatistikBeranda,
  getStatistikBerandaDetail,
  getStatistikPerDusun,
} from "@/lib/statistikBeranda";
import { getConfigDesa, labelWilayah } from "@/lib/configDesa";
import { getGaleri, getGaleriCount } from "@/lib/galeri";
import { getWisata, getWisataCount } from "@/lib/wisata";
import { getBeritaTerbit } from "@/lib/berita";
import { getStrukturPublik } from "@/lib/strukturOrganisasi";
import { getRingkasanApbdesTerbaru } from "@/lib/apbdes";
import { createClient } from "@/lib/supabase/server";

const JUMLAH_GALERI_BERANDA = 8;
const JUMLAH_WISATA_BERANDA = 4;
const JUMLAH_BERITA_BERANDA = 3;

const LAYANAN = [
  {
    nama: "Ajukan Layanan",
    deskripsi:
      "Surat domisili, SKTM, pengaduan, dan layanan lain — isi form, dapat kode tracking. Jenis layanan terus bertambah.",
    icon: IconMail,
    href: "/layanan",
  },
  {
    nama: "Cek Penerima Bantuan",
    deskripsi:
      "PKH, BLT Dana Desa, sembako, dan bantuan lain — lihat daftar nama penerima yang ditampilkan pemerintah desa.",
    icon: IconHeartHandshake,
    href: "/layanan/bantuan",
    cta: "Cek daftar penerima",
  },
  {
    nama: "Data Saya",
    deskripsi:
      "Lihat data kependudukan Anda dengan NIK dan tanggal lahir. Ada yang keliru atau kurang? Laporkan langsung ke admin desa.",
    icon: IconIdCard,
    href: "/layanan/data-saya",
    cta: "Lihat data saya",
  },
  {
    nama: "Pendaftaran Akun",
    deskripsi: "Khusus perangkat desa (Kepala Dusun atau Ketua RT) yang membutuhkan akun untuk mengelola data wilayahnya.",
    icon: IconUsers,
    href: "/pendaftaran",
  },
  {
    nama: "Pengumuman Desa",
    deskripsi: "Info dan pengumuman resmi dari kantor desa, tidak perlu datang untuk tahu.",
    icon: IconMegaphone,
  },
];

const CARA_KERJA = [
  {
    nomor: "1",
    judul: "Isi form",
    teks: "Pilih jenis layanan, isi data yang diminta, kirim. Tidak perlu daftar akun atau ingat kata sandi.",
  },
  {
    nomor: "2",
    judul: "Dapat kode tracking",
    teks: "Setiap pengajuan dapat kode unik, mis. SRT-AB12CD — simpan untuk memantau prosesnya.",
  },
  {
    nomor: "3",
    judul: "Cek & ambil",
    teks: "Pantau status kapan saja lewat kode tadi. Datang ke kantor desa hanya saat sudah siap.",
  },
];

const JAMINAN = [
  {
    judul: "Tanpa akun",
    teks: "Tidak ada pendaftaran, tidak ada kata sandi untuk warga. Buka form, isi, selesai.",
  },
  {
    judul: "Diproses staf resmi",
    teks: "Setiap pengajuan masuk ke panel perangkat desa yang login dengan akun resmi, bukan bot.",
  },
  {
    judul: "Transparan",
    teks: "Status pengajuan bisa dicek sendiri kapan saja, tanpa perlu menelepon kantor desa berkali-kali.",
  },
];

// Lencana kaca yang melayang di sekitar lambang hero (hanya hiasan; isinya
// ringkasan dari daftar JAMINAN di atas). Posisi & jeda animasi dibedakan
// supaya geraknya tidak serempak.
const LENCANA_HERO = [
  { teks: "Tanpa akun", posisi: "left-0 top-[12%] lg:-left-6", jeda: "" },
  { teks: "Kode tracking unik", posisi: "right-0 top-[44%] lg:-right-4", jeda: "[animation-delay:-2.5s]" },
  { teks: "Diproses staf resmi", posisi: "bottom-[8%] left-[6%] lg:-left-2", jeda: "[animation-delay:-5s]" },
];

export default async function HomePage() {
  const supabase = await createClient();
  const [stats, statsDetail, statsDusun, config, galeriItems, galeriTotal, wisataItems, wisataTotal, berita, apbdes, pengunjung, struktur] = await Promise.all([
    getStatistikBeranda(),
    getStatistikBerandaDetail(),
    getStatistikPerDusun(),
    getConfigDesa(supabase),
    getGaleri(supabase, { limit: JUMLAH_GALERI_BERANDA }),
    getGaleriCount(supabase),
    getWisata(supabase, { limit: JUMLAH_WISATA_BERANDA }),
    getWisataCount(supabase),
    getBeritaTerbit(supabase, { limit: JUMLAH_BERITA_BERANDA }),
    getRingkasanApbdesTerbaru(supabase),
    getPengunjung(),
    getStrukturPublik(supabase),
  ]);

  const wilayah = labelWilayah(config);

  return (
    <main className="overflow-x-clip bg-white">
      {/* Hero — identitas desa: latar putih bersih, judul hitam, aksen merah secukupnya. */}
      <section id="hero-beranda" className="latar-terang relative overflow-hidden">
        {config.foto_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={config.foto_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-90 [mask-image:radial-gradient(ellipse_75%_85%_at_62%_45%,black_28%,transparent_78%)]"
          />
        )}

        {/* Lapisan putih tipis di sisi teks (kiri) supaya tulisan tetap jelas; foto tetap tampil di kanan. */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/45 to-transparent max-lg:from-white/70 max-lg:via-white/50 max-lg:to-white/60" />

        

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-6 pt-[calc(var(--header-h)+1.5rem)] md:pt-[calc(var(--header-h)+2.5rem)] lg:grid-cols-[1.15fr_0.85fr] lg:gap-8">
          {/* Kolom teks */}
          <div className="text-center lg:text-left">
            {/* Hari, tanggal & jam setempat */}
            <Reveal variant="down" delay={50}>
              <div className="lg:[&>div]:justify-start">
                <JamTanggalBeranda />
              </div>
            </Reveal>

            {/* Sapaan + identitas desa: satu blok, tiap informasi tampil sekali saja. */}
            <Reveal delay={150}>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-navy sm:text-xs">
                Selamat datang di website
              </p>
            </Reveal>

            <Reveal delay={230}>
              <h1 className="mt-4 font-display font-bold leading-[1.05] text-navy-dark">
                {config.nama_desa ? (
                  <>
                    <span className="block text-3xl font-medium italic text-navy/75 sm:text-4xl">
                      {config.jenis_wilayah || "Desa"}
                    </span>
                    <span className="teks-royal mt-1 block pb-2 text-6xl sm:text-7xl lg:text-8xl">
                      {config.nama_desa}
                    </span>
                  </>
                ) : (
                  <span className="block text-4xl sm:text-6xl">Portal Layanan Digital Desa</span>
                )}
              </h1>
              {/* Garis aksen: tumbuh dari kiri begitu hero terlihat. */}
              <span
                aria-hidden
                className="garis-aksen anim-saat-tampil mx-auto mt-1 block origin-left motion-safe:animate-garisTumbuh lg:mx-0"
              />
              {/* Wilayah & alamat: hanya di sini, tidak diulang di tempat lain di hero. */}
              {(wilayah || config.alamat) && (
                <p className="mt-5 inline-flex max-w-xl items-start gap-2 text-left text-sm font-medium leading-relaxed text-slate-700 sm:text-base">
                  <IconMapPin className="mt-1 h-4 w-4 shrink-0 text-navy" />
                  <span>
                    {wilayah}
                    {wilayah && config.alamat ? " · " : ""}
                    {config.alamat}
                  </span>
                </p>
              )}
            </Reveal>

            <Reveal delay={320}>
              <p className="mx-auto mt-5 max-w-lg font-display text-xl font-semibold leading-snug text-navy-dark sm:text-2xl lg:mx-0">
                Layanan desa dalam genggaman,{" "}
                <em className="italic text-navy underline decoration-gold decoration-[3px] underline-offset-[6px]">
                  tanpa
                </em>{" "}
                antre.
              </p>
            </Reveal>

            <Reveal delay={400}>
              <div className="mt-8 flex flex-col items-center justify-center gap-3.5 sm:flex-row lg:justify-start">
                <Link
                  href="/layanan"
                  className="group inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-royal px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-navy-dark sm:w-auto"
                >
                  Ajukan Layanan
                  <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/layanan/cek"
                  className="group inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-xl border-2 border-navy/25 bg-white px-7 py-3.5 text-sm font-semibold text-navy shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-navy hover:bg-navy hover:text-white hover:shadow-lg hover:shadow-navy/25 sm:w-auto"
                >
                  Cek Status Pengajuan
                </Link>
              </div>
            </Reveal>
          </div>

          {/* Kolom lambang — cakram putih bercahaya, cincin memancar, titik emas mengorbit, lencana melayang */}
          <Reveal variant="zoom" delay={320} className="order-first lg:order-none">
            <div className="anim-saat-tampil group relative mx-auto w-44 text-navy sm:w-56 lg:w-full lg:max-w-sm">
              <VillageSeal
                className="aspect-square transition-transform duration-500 group-hover:scale-105"
                logoUrl={config.logo_url}
              />

              
            </div>
          </Reveal>
        </div>

        {/* Kartu statistik singkat */}
        <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-12 md:pb-28 md:pt-16">
          <StatBerandaCards stats={stats} />

          
        </div>

        {/* Gelombang penutup hero — warnanya sama dengan awal bagian di bawahnya */}
        <div className="absolute inset-x-0 bottom-0">
          <WaveDivider className="text-white" />
        </div>
      </section>

      <AuroraBackground>
        {/* Sambutan Kepala Desa / Lurah */}
        {config.kepala_desa_nama && config.kepala_desa_sambutan && (
          <section className="py-16 md:py-24">
            <Reveal variant="zoom" blur={false} className="mx-auto max-w-5xl px-6">
              <SectionHeading
                rata="tengah"
                kecil="Kata Sambutan"
                judul={`Sambutan ${config.jenis_wilayah === "Kelurahan" ? "Lurah" : "Kepala Desa"}`}
              />

              <div className="bingkai-gradasi mt-10 overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-lg shadow-slate-200/50 transition-shadow duration-300 hover:shadow-2xl hover:shadow-navy/15">
                <div className="grid gap-0 md:grid-cols-[300px_1fr]">
                  <div className="relative flex flex-col items-center justify-center gap-4 overflow-hidden bg-royal px-6 py-10 text-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-navy-light via-navy to-navy-dark" />
                    <div aria-hidden className="pola-titik absolute inset-0 opacity-60 [mask-image:radial-gradient(circle_at_50%_40%,black,transparent_75%)]" />
                    <div className="relative">
                      <div aria-hidden className="absolute -inset-3 rounded-full bg-gold/25 blur-xl" />
                      {config.kepala_desa_foto_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={config.kepala_desa_foto_url}
                          alt={config.kepala_desa_nama}
                          className="relative h-36 w-36 rounded-full border-4 border-gold-light/80 object-cover shadow-2xl"
                        />
                      ) : (
                        <div className="relative flex h-36 w-36 items-center justify-center rounded-full border-4 border-gold-light/80 bg-navy-dark font-display text-5xl font-semibold text-gold-light shadow-2xl">
                          {config.kepala_desa_nama.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="relative">
                      <p className="font-display text-lg font-semibold text-white">
                        {config.kepala_desa_nama}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-wider text-gold-light">
                        {config.jenis_wilayah === "Kelurahan" ? "Lurah" : "Kepala Desa"}
                        {config.nama_desa ? ` ${config.nama_desa}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="relative flex flex-col justify-center px-6 py-10 sm:px-12">
                    <span className="select-none font-display text-8xl leading-none text-gold/30">
                      &ldquo;
                    </span>
                    <p className="-mt-10 whitespace-pre-line text-base leading-relaxed text-slate-600 sm:text-lg">
                      {config.kepala_desa_sambutan}
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          </section>
        )}

        {/* Layanan — tata letak bento: kartu pertama menonjol, sisanya mengikuti */}
        <section id="layanan" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-16 md:py-24">
          <Reveal>
            <SectionHeading
              kecil="Tanpa Akun, Tanpa Antre"
              judul="Layanan yang bisa diakses sekarang"
            />
          </Reveal>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {LAYANAN.map(({ nama, deskripsi, icon: Icon, href, cta }, idx) => {
              const Wrapper = href ? Link : "div";
              const unggulan = idx === 0;
              return (
                <Reveal
                  key={nama}
                  delay={idx * 120}
                  className={`h-full ${unggulan ? "sm:col-span-2" : ""}`}
                >
                  <SpotlightCard className="h-full rounded-2xl">
                    <Wrapper
                      {...(href ? { href } : {})}
                      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border p-7 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-2xl ${
                        unggulan
                          ? "border-navy-light/50 bg-gradient-to-br from-navy-light via-navy to-navy-dark shadow-xl shadow-navy/30 hover:shadow-navy/50 sm:p-9"
                          : href
                            ? "bingkai-gradasi border-slate-200/80 bg-white/95 hover:bg-white hover:shadow-navy/15"
                            : "border-dashed border-slate-300 bg-white/60"
                      }`}
                    >
                      {unggulan && (
                        <>
                          <div aria-hidden className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gold/25 blur-3xl transition duration-500 group-hover:bg-gold/40" />
                          <div aria-hidden className="pola-titik absolute inset-0 opacity-50 [mask-image:radial-gradient(circle_at_85%_15%,black,transparent_60%)]" />
                        </>
                      )}

                      {/* Badge status; titik berdenyut hanya untuk layanan aktif */}
                      <span
                        className={`absolute right-5 top-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium ${
                          href
                            ? unggulan
                              ? "border border-white/20 bg-white/10 text-emerald-200"
                              : "border border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {href && (
                          <span className="relative flex h-2 w-2">
                            <span className="anim-saat-tampil absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                          </span>
                        )}
                        {href ? "Aktif" : "Segera hadir"}
                      </span>

                      <div
                        className={`relative flex items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:-rotate-3 ${
                          unggulan ? "h-14 w-14" : "h-12 w-12"
                        } ${
                          unggulan
                            ? "bg-gradient-to-br from-gold to-gold-light text-navy-dark shadow-lg shadow-gold/30"
                            : href
                              ? "bg-gradient-to-br from-royal to-royal-light text-white shadow-md shadow-navy/30"
                              : "bg-navy/10 text-navy"
                        }`}
                      >
                        <Icon className={unggulan ? "h-6 w-6" : "h-5 w-5"} />
                      </div>

                      <h3
                        className={`relative mt-5 font-display font-semibold ${
                          unggulan ? "text-2xl text-white sm:text-3xl" : "text-lg text-slate-800"
                        }`}
                      >
                        {nama}
                      </h3>
                      <p
                        className={`relative mt-2 text-sm leading-relaxed ${
                          unggulan ? "max-w-md text-white/75 sm:text-base" : "text-slate-500"
                        }`}
                      >
                        {deskripsi}
                      </p>
                      {href && (
                        <span
                          className={`relative mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold transition-colors ${
                            unggulan
                              ? "text-gold-light group-hover:text-white"
                              : "text-navy group-hover:text-navy-dark"
                          }`}
                        >
                          {cta ?? "Mulai ajukan"}
                          <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
                        </span>
                      )}
                    </Wrapper>
                  </SpotlightCard>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* Struktur organisasi — bagan perangkat desa; tampil hanya kalau admin sudah mengisi */}
        <Reveal blur={false}>
          <StrukturBeranda pohon={struktur} />
        </Reveal>

        {/* Cuaca & gempa dari BMKG — di-stream lewat Suspense supaya beranda tidak
            menunggu BMKG; tidak tampil kalau BMKG tidak bisa dihubungi. */}
        <Suspense fallback={null}>
          <BmkgBeranda config={config} />
        </Suspense>

        {/* Berita terbaru — tampil hanya kalau ada berita terbit */}
        <Reveal blur={false}>
          <BeritaBeranda items={berita.items} totalSemua={berita.total} />
        </Reveal>

        {/* Wisata desa — tampil hanya kalau admin sudah mengisi minimal satu */}
        <Reveal blur={false}>
          <WisataBeranda items={wisataItems} totalSemua={wisataTotal} />
        </Reveal>

        {/* Galeri kegiatan — pembungkus besar: tanpa blur supaya ringan */}
        <Reveal blur={false}>
          <GaleriBeranda items={galeriItems} totalSemua={galeriTotal} />
        </Reveal>

        {/* Statistik kependudukan — pembungkus besar: tanpa blur */}
        <Reveal blur={false}>
          <StatistikDetailBeranda
            detail={statsDetail}
            perDusun={statsDusun}
            namaDesa={config.nama_desa}
            wilayah={wilayah}
          />
        </Reveal>

        {/* Transparansi APBDes — tampil hanya kalau ada tahun yang diterbitkan */}
        <Reveal blur={false}>
          <ApbdesBeranda data={apbdes} />
        </Reveal>

        {/* Cara kerja — tiga langkah, garis emas menembus lingkaran angka di desktop */}
        <section className="py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-6">
            <Reveal>
              <SectionHeading rata="tengah" kecil="Prosesnya" judul="Tiga langkah, selesai" />
            </Reveal>

            <div className="relative mt-14 grid gap-8 md:grid-cols-3 md:gap-6">
              {/* Garis penghubung: dari tengah kolom 1 ke tengah kolom 3 (1/6 → 5/6),
                  sejajar tengah lingkaran angka (h-14 → 1.75rem dari atas). */}
              <span
                aria-hidden
                className="absolute left-[16.66%] right-[16.66%] top-7 hidden h-px bg-gradient-to-r from-gold/0 via-gold to-gold/0 shadow-[0_0_10px_rgba(201,162,77,0.7)] md:block"
              />
              {CARA_KERJA.map(({ nomor, judul, teks }, i) => (
                <Reveal key={nomor} delay={i * 160} variant="zoom" className="relative h-full">
                  <div className="flex h-full flex-col items-center text-center">
                    <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/60 bg-gradient-to-br from-navy-light to-navy-dark font-display text-2xl font-bold text-white shadow-lg shadow-navy/35 ring-4 ring-white">
                      {nomor}
                    </div>
                    <SpotlightCard className="-mt-7 h-full w-full rounded-2xl">
                      <div className="bingkai-gradasi flex h-full flex-col items-center rounded-2xl border border-slate-200/80 bg-white/90 px-7 pb-7 pt-12 text-center shadow-sm transition-all duration-300 ease-out hover:-translate-y-2 hover:bg-white hover:shadow-xl hover:shadow-navy/15">
                        <h3 className="font-display text-lg font-semibold text-slate-800">{judul}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-500">{teks}</p>
                      </div>
                    </SpotlightCard>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </AuroraBackground>

      {/* Jaminan — pita gelap penutup sebelum footer, berisi tiga janji + ajakan bertindak */}
      <section className="latar-mesh butiran relative overflow-hidden">
        <div aria-hidden className="pola-titik pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_50%_0%,black,transparent_70%)]" />
        <div className="relative mx-auto max-w-6xl px-6 py-16 md:py-20">
          <div className="grid gap-6 sm:grid-cols-3">
            {JAMINAN.map(({ judul, teks }, i) => (
              <Reveal
                key={judul}
                delay={i * 140}
                variant={["left", "up", "right"][i]}
                className="h-full"
              >
                <div className="kaca group flex h-full gap-3.5 rounded-2xl p-6 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-gold/40 hover:bg-white/10">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-light text-navy-dark shadow-md shadow-gold/30 transition-transform duration-300 group-hover:scale-110">
                    <IconCheck className="h-4 w-4 stroke-[3]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{judul}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-white/65">{teks}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={200}>
            <div className="mt-12 flex flex-col items-center gap-5 text-center">
              <div className="ornamen w-full max-w-xs" aria-hidden>
                <span className="h-2 w-2 rotate-45 bg-gold" />
              </div>
              <p className="max-w-xl font-display text-xl font-semibold leading-snug text-white sm:text-2xl">
                Urus layanan desa dari ponsel Anda, kapan saja.
              </p>
              <Link
                href="/layanan"
                className="tombol-kilau group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold to-gold-light px-8 py-3.5 text-sm font-bold text-navy-dark shadow-lg shadow-gold/35 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-gold/55"
              >
                Mulai Ajukan Layanan
                <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <Reveal variant="fade" blur={false}>
        <PublicFooter
          namaDesa={config.nama_desa}
          jenisWilayah={config.jenis_wilayah}
          wilayah={wilayah}
          alamat={config.alamat}
          pengunjung={pengunjung}
        />
      </Reveal>

      {/* Menjeda animasi berulang (blob, lambang, titik denyut) sampai terlihat di layar. */}
      <JedaAnimasiDiluarLayar />
    </main>
  );
}
