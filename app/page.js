import Image from "next/image";
import Link from "next/link";
import VillageSeal from "@/components/VillageSeal";
import PublicHeader from "@/components/PublicHeader";
import StatBerandaCards from "@/components/StatBerandaCards";
import {
  IconMail,
  IconMegaphone,
  IconUsers,
  IconCheck,
  IconArrowRight,
} from "@/components/icons";
import { getStatistikBeranda } from "@/lib/statistikBeranda";

const LAYANAN = [
  {
    nama: "Ajukan Layanan",
    deskripsi:
      "Surat domisili, SKTM, pengaduan, dan layanan lain — isi form, dapat kode tracking. Jenis layanan terus bertambah.",
    icon: IconMail,
    href: "/layanan",
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
  const stats = await getStatistikBeranda();

  return (
    <main className="bg-white">
      <PublicHeader />

      {/* Hero */}
      <section className="relative overflow-hidden bg-navy-dark">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 md:grid-cols-[1.1fr_0.9fr] md:py-24">
          <div className="animate-fadeUp">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-gold">
              Portal Layanan Digital Desa
            </p>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.1] text-white sm:text-5xl">
              Satu kali isi form,{" "}
              <em className="italic text-gold-light">tanpa</em> bolak-balik
              kantor desa.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-white/70">
              SI-LIPU mengurus surat, pengaduan, dan informasi desa langsung
              dari ponsel Anda — tanpa akun, tanpa antre di loket.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/layanan"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gold px-6 py-3 text-sm font-semibold text-navy-dark transition hover:bg-gold-light"
              >
                Ajukan Layanan
                <IconArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/layanan/cek"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 px-6 py-3 text-sm font-medium text-white transition hover:border-white/40 hover:bg-white/5"
              >
                Cek Status Pengajuan
              </Link>
            </div>
          </div>

          <div className="mx-auto w-56 text-gold-light/80 sm:w-64 md:w-full md:max-w-xs">
            <VillageSeal className="aspect-square" />
          </div>
        </div>

        {/* Statistik desa singkat — arahkan kursor ke kartu untuk efek zoom */}
        <div className="relative mx-auto max-w-6xl px-6 pb-14 md:pb-20">
          <StatBerandaCards stats={stats} />
        </div>

        {/* Garis emas tipis penutup hero, kesan "kop surat" */}
        <div className="h-1 w-full bg-gradient-to-r from-gold via-gold-light to-gold" />
      </section>

      {/* Layanan */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-seablue">
          Tanpa Akun, Tanpa Antre
        </p>
        <h2 className="mt-3 font-display text-2xl font-semibold text-navy sm:text-3xl">
          Layanan yang bisa diakses sekarang
        </h2>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {LAYANAN.map(({ nama, deskripsi, icon: Icon, href }) => {
            const Wrapper = href ? Link : "div";
            return (
              <Wrapper
                key={nama}
                {...(href ? { href } : {})}
                className={`group relative overflow-hidden rounded-2xl border p-6 transition ${
                  href
                    ? "border-gold/40 bg-navy/[0.02] hover:border-gold hover:shadow-md"
                    : "border-slate-200 bg-white"
                }`}
              >
                <span
                  className={`absolute right-5 top-5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    href
                      ? "bg-gold/15 text-navy"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {href ? "Aktif" : "Segera hadir"}
                </span>
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                    href ? "bg-navy text-gold-light" : "bg-navy/10 text-navy"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-slate-800">
                  {nama}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                  {deskripsi}
                </p>
                {href && (
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-navy">
                    Mulai ajukan
                    <IconArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                  </span>
                )}
              </Wrapper>
            );
          })}
        </div>
      </section>

      {/* Cara kerja */}
      <section className="bg-slate-50 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-seablue">
            Prosesnya
          </p>
          <h2 className="mt-3 font-display text-2xl font-semibold text-navy sm:text-3xl">
            Tiga langkah, selesai
          </h2>

          <div className="mt-10 grid gap-8 md:grid-cols-3 md:gap-6">
            {CARA_KERJA.map(({ nomor, judul, teks }, i) => (
              <div key={nomor} className="relative">
                {i < CARA_KERJA.length - 1 && (
                  <div className="absolute right-[-1.5rem] top-6 hidden h-px w-12 bg-slate-300 md:block" />
                )}
                <span className="font-display text-4xl font-semibold text-gold">
                  {nomor}
                </span>
                <h3 className="mt-3 font-semibold text-slate-800">{judul}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                  {teks}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Jaminan / trust */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="grid gap-8 sm:grid-cols-3">
          {JAMINAN.map(({ judul, teks }) => (
            <div key={judul} className="flex gap-3">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-white">
                <IconCheck className="h-3.5 w-3.5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">{judul}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">
                  {teks}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
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
            href="/login"
            className="text-xs text-slate-400 underline hover:text-slate-600"
          >
            Login admin/petugas desa
          </Link>
        </div>
        <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-3 text-center">
          <p className="text-[11px] text-slate-400">
            SI-LIPU dikembangkan pertama kali untuk Desa Tatakalai, Kabupaten
            Banggai Kepulauan — digagas oleh Tasrib A. Abbas, S.AP.
          </p>
        </div>
      </footer>
    </main>
  );
}
