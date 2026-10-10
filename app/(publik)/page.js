import Image from "next/image";
import Link from "next/link";
import VillageSeal from "@/components/VillageSeal";
import StatBerandaCards from "@/components/StatBerandaCards";
import StatistikDetailBeranda from "@/components/StatistikDetailBeranda";
import Reveal from "@/components/Reveal";
import AuroraBackground from "@/components/AuroraBackground";
import GaleriBeranda from "@/components/GaleriBeranda";
import JamTanggalBeranda from "@/components/JamTanggalBeranda";
import {
  IconMail,
  IconMegaphone,
  IconUsers,
  IconCheck,
  IconArrowRight,
  IconHeartHandshake,
  IconIdCard,
} from "@/components/icons";
import {
  getStatistikBeranda,
  getStatistikBerandaDetail,
  getStatistikPerDusun,
} from "@/lib/statistikBeranda";
import { getConfigDesa, labelWilayah } from "@/lib/configDesa";
import { getGaleri, getGaleriCount } from "@/lib/galeri";
import { createClient } from "@/lib/supabase/server";

const JUMLAH_GALERI_BERANDA = 8;

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
    nama: "Pendaftaran Kadus/Ketua RT",
    deskripsi: "Khusus calon Kepala Dusun atau Ketua RT yang ingin mendaftar posisi di wilayahnya.",
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

export default async function HomePage() {
  const supabase = await createClient();
  const [stats, statsDetail, statsDusun, config, galeriItems, galeriTotal] = await Promise.all([
    getStatistikBeranda(),
    getStatistikBerandaDetail(),
    getStatistikPerDusun(),
    getConfigDesa(supabase),
    getGaleri(supabase, { limit: JUMLAH_GALERI_BERANDA }),
    getGaleriCount(supabase),
  ]);

  const wilayah = labelWilayah(config);

  return (
    <main className="overflow-x-clip bg-white">
      {/* Hero — identitas desa dengan latar foto & lapisan gradasi */}
      <section className="relative overflow-hidden bg-navy-dark">
        {config.foto_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={config.foto_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-85"
          />
        )}

        {/* Lapisan gelap di atas foto supaya teks tetap kontras. */}
        <div className="absolute inset-0 bg-gradient-to-b from-navy-dark/65 via-navy-dark/55 to-navy-dark/85" />

        {/* Ambient glow lembut di bagian tengah hero */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-seablue/15 blur-3xl"
        />

        <div className="relative mx-auto max-w-6xl px-6 pt-5 text-center md:pt-8">
          {/* Hari, tanggal & jam setempat */}
          <Reveal variant="down" delay={50}>
            <JamTanggalBeranda />
          </Reveal>
          <Reveal delay={120}>
            <p className="mt-3 font-mono text-xs uppercase tracking-[0.25em] text-gold">
              {config.jenis_wilayah || "Desa"}
              {wilayah ? ` · ${wilayah}` : ""}
            </p>
          </Reveal>
          <Reveal delay={200}>
            <h1 className="mx-auto mt-3 max-w-3xl font-display text-4xl font-bold leading-[1.1] text-white drop-shadow-md sm:text-6xl">
              {config.nama_desa
                ? `${config.jenis_wilayah || "Desa"} ${config.nama_desa}`
                : "Portal Layanan Digital Desa"}
            </h1>
            {wilayah && (
              <p className="mt-3 text-sm text-white/80 drop-shadow sm:text-base">{wilayah}</p>
            )}
            {config.alamat && <p className="mt-1 text-xs text-white/60">{config.alamat}</p>}
          </Reveal>

          {/* Logo / Lambang Desa */}
          <Reveal variant="zoom" delay={320}>
            <div className="group relative mx-auto mt-6 w-40 text-gold-light/80 transition-transform duration-500 hover:scale-105 sm:w-48">
              <div
                aria-hidden
                className="absolute inset-0 -z-10 rounded-full bg-gold/10 blur-2xl transition duration-500 group-hover:bg-gold/25"
              />
              <VillageSeal className="aspect-square" logoUrl={config.logo_url} />
            </div>
          </Reveal>
        </div>

        {/* Sambutan singkat & tombol cepat */}
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 pb-16 pt-10 md:py-16">
          <div className="text-center">
            <Reveal delay={150}>
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-gold">
                Portal Layanan Digital Desa
              </p>
              <h2 className="mx-auto mt-4 max-w-2xl font-display text-2xl font-semibold leading-[1.2] text-white sm:text-3xl">
                Satu kali isi form, <em className="italic text-gold-light">tanpa</em> bolak-balik
                kantor desa.
              </h2>
            </Reveal>
            <Reveal delay={250}>
              <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-white/75">
                SI-LIPU mengurus surat, pengaduan, dan informasi desa langsung dari ponsel Anda —
                tanpa akun, tanpa antre di loket.
              </p>
            </Reveal>

            <Reveal delay={350}>
              <div className="mt-8 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
                <Link
                  href="/layanan"
                  className="group inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold to-gold-light px-7 py-3.5 text-sm font-semibold text-navy-dark shadow-lg shadow-gold/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-gold/30 sm:w-auto"
                >
                  Ajukan Layanan
                  <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/layanan/cek"
                  className="inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/5 px-7 py-3.5 text-sm font-medium text-white backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-white/50 hover:bg-white/10 sm:w-auto"
                >
                  Cek Status Pengajuan
                </Link>
              </div>
            </Reveal>
          </div>
        </div>

        {/* Kartu statistik singkat */}
        <div className="relative mx-auto max-w-6xl px-6 pb-14 md:pb-20">
          <StatBerandaCards stats={stats} />
        </div>

        {/* Garis emas penutup hero */}
        <div className="relative h-1 w-full bg-gradient-to-r from-gold via-gold-light to-gold shadow-[0_0_12px_rgba(232,185,51,0.5)]" />
      </section>

      <AuroraBackground>
        {/* Sambutan Kepala Desa / Lurah */}
        {config.kepala_desa_nama && config.kepala_desa_sambutan && (
          <section className="py-16 md:py-24">
            <Reveal variant="zoom" blur={false} className="mx-auto max-w-5xl px-6">
              <p className="text-center font-mono text-xs uppercase tracking-[0.25em] text-seablue">
                Kata Sambutan
              </p>
              <h2 className="mt-3 text-center font-display text-2xl font-semibold text-navy sm:text-3xl">
                Sambutan {config.jenis_wilayah === "Kelurahan" ? "Lurah" : "Kepala Desa"}
              </h2>

              <div className="mt-10 overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-lg shadow-slate-200/50 transition-shadow duration-300 hover:shadow-xl">
                <div className="grid gap-0 md:grid-cols-[280px_1fr]">
                  <div className="relative flex flex-col items-center justify-center gap-4 bg-navy px-6 py-10 text-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy to-navy-dark opacity-90" />
                    <div className="relative">
                      {config.kepala_desa_foto_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={config.kepala_desa_foto_url}
                          alt={config.kepala_desa_nama}
                          className="h-32 w-32 rounded-full border-4 border-gold-light/80 object-cover shadow-xl"
                        />
                      ) : (
                        <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-gold-light/80 bg-navy-light font-display text-4xl font-semibold text-gold-light shadow-xl">
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

                  <div className="relative flex flex-col justify-center px-6 py-10 sm:px-10">
                    <span className="select-none font-display text-6xl leading-none text-gold/25">
                      &ldquo;
                    </span>
                    <p className="-mt-8 whitespace-pre-line text-base leading-relaxed text-slate-600 sm:text-lg">
                      {config.kepala_desa_sambutan}
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          </section>
        )}

        {/* Layanan */}
        <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-seablue">
              Tanpa Akun, Tanpa Antre
            </p>
            <h2 className="mt-3 font-display text-2xl font-semibold text-navy sm:text-3xl">
              Layanan yang bisa diakses sekarang
            </h2>
          </Reveal>

          <div className="mt-9 grid gap-5 sm:grid-cols-2">
            {LAYANAN.map(({ nama, deskripsi, icon: Icon, href, cta }, idx) => {
              const Wrapper = href ? Link : "div";
              return (
                <Reveal key={nama} delay={idx * 140} className="h-full">
                  <Wrapper
                    {...(href ? { href } : {})}
                    className={`group relative block h-full overflow-hidden rounded-2xl border p-7 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-xl hover:shadow-navy/10 ${
                      href
                        ? "border-gold/40 bg-white/90 hover:border-gold hover:bg-white"
                        : "border-slate-200 bg-white/80"
                    }`}
                  >
                    {/* Badge status; titik berdenyut hanya untuk layanan aktif */}
                    <span
                      className={`absolute right-5 top-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium ${
                        href
                          ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {href && (
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                        </span>
                      )}
                      {href ? "Aktif" : "Segera hadir"}
                    </span>
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 ${
                        href
                          ? "bg-navy text-gold-light shadow-md shadow-navy/20"
                          : "bg-navy/10 text-navy"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 font-display text-lg font-semibold text-slate-800">
                      {nama}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500">{deskripsi}</p>
                    {href && (
                      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-navy transition-colors group-hover:text-navy-light">
                        {cta ?? "Mulai ajukan"}
                        <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </span>
                    )}
                  </Wrapper>
                </Reveal>
              );
            })}
          </div>
        </section>

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

        {/* Cara kerja — tiga langkah dengan garis penghubung di desktop */}
        <section className="py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-6">
            <Reveal>
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-seablue">
                Prosesnya
              </p>
              <h2 className="mt-3 font-display text-2xl font-semibold text-navy sm:text-3xl">
                Tiga langkah, selesai
              </h2>
            </Reveal>

            <div className="mt-12 grid gap-8 md:grid-cols-3 md:gap-6">
              {CARA_KERJA.map(({ nomor, judul, teks }, i) => (
                <Reveal key={nomor} delay={i * 160} variant="zoom" className="relative h-full">
                  <div className="relative flex h-full flex-col items-center rounded-2xl border border-slate-200/80 bg-white/90 p-7 text-center shadow-sm transition-all duration-300 ease-out hover:-translate-y-2 hover:border-gold hover:shadow-xl hover:shadow-navy/10">
                    {/* Garis penghubung antar lingkaran angka (hanya desktop).
                        Digambar DI DALAM kartu, sejajar tengah lingkaran
                        (p-7 + setengah h-14 = 3.5rem dari atas), dan menembus
                        celah antar kartu (md:gap-6 = 1.5rem). */}
                    {i < CARA_KERJA.length - 1 && (
                      <span
                        aria-hidden
                        className="absolute left-1/2 top-[3.5rem] hidden h-[2px] w-[calc(50%+1.5rem)] -translate-y-1/2 bg-gold/60 shadow-[0_0_8px_rgba(232,185,51,0.5)] md:block"
                      />
                    )}
                    {i > 0 && (
                      <span
                        aria-hidden
                        className="absolute right-1/2 top-[3.5rem] hidden h-[2px] w-[calc(50%+1.5rem)] -translate-y-1/2 bg-gold/60 shadow-[0_0_8px_rgba(232,185,51,0.5)] md:block"
                      />
                    )}
                    <div className="relative z-10 mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/30 bg-gradient-to-br from-navy to-navy-dark font-display text-2xl font-bold text-gold shadow-lg shadow-navy/25">
                      {nomor}
                    </div>
                    <h3 className="font-display text-lg font-semibold text-slate-800">{judul}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500">{teks}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Jaminan / trust */}
        <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <div className="grid gap-6 sm:grid-cols-3">
            {JAMINAN.map(({ judul, teks }, i) => (
              <Reveal
                key={judul}
                delay={i * 140}
                variant={["left", "up", "right"][i]}
                className="h-full"
              >
                <div className="flex h-full gap-3.5 rounded-2xl border border-transparent p-5 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-slate-200 hover:bg-white/80 hover:shadow-lg">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy text-gold shadow-sm">
                    <IconCheck className="h-4 w-4 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{judul}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-500">{teks}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      </AuroraBackground>

      {/* Footer */}
      <Reveal variant="fade" blur={false}>
        <footer className="border-t border-slate-100 bg-white">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
            <div className="flex items-center gap-2.5">
              <Image src="/logo-si-lipu.png" alt="Logo SI-LIPU" width={22} height={22} />
              <span className="text-xs text-slate-400">
                SI-LIPU — Sistem Informasi Layanan Interaktif Pelayanan Umum
              </span>
            </div>
            <Link
              href="/login"
              className="text-xs text-slate-400 underline transition hover:text-navy"
            >
              Login admin/petugas desa
            </Link>
          </div>
          <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-3.5 text-center">
            <p className="text-[11px] text-slate-400">
              SI-LIPU dikembangkan pertama kali untuk Desa Tatakalai, Kabupaten Banggai Kepulauan —
              digagas oleh Tasrib A. Abbas, S.AP.
            </p>
          </div>
        </footer>
      </Reveal>
    </main>
  );
}
