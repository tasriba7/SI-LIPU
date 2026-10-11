import Image from "next/image";
import Link from "next/link";
import PengunjungBeranda from "@/components/PengunjungBeranda";
import { IconArrowRight, IconMapPin } from "@/components/icons";

// Footer beranda publik. Murni tampilan: semua data (identitas desa, angka
// pengunjung) dioper dari app/(publik)/page.js, tidak ada pengambilan data di sini.
//
// PENTING (docs/BRANDING.md): baris kredit originator di bagian bawah dan
// identitas instance (nama desa + wilayah) TIDAK BOLEH dihapus.
const TAUTAN_JELAJAHI = [
  { nama: "Berita Desa", href: "/berita" },
  { nama: "Wisata Desa", href: "/wisata" },
  { nama: "Galeri Kegiatan", href: "/galeri" },
  { nama: "Profil Desa", href: "/profil" },
  { nama: "Struktur Organisasi", href: "/struktur-organisasi" },
  { nama: "APBDes", href: "/apbdes" },
  { nama: "Cuaca & Gempa", href: "/cuaca" },
];

const TAUTAN_WARGA = [
  { nama: "Ajukan Layanan", href: "/layanan" },
  { nama: "Cek Status Pengajuan", href: "/layanan/cek" },
  { nama: "Riwayat Ajuan", href: "/layanan/riwayat" },
  { nama: "Data Saya", href: "/layanan/data-saya" },
  { nama: "Cek Penerima Bantuan", href: "/layanan/bantuan" },
  { nama: "Pendaftaran Akun", href: "/pendaftaran" },
];

function KolomTautan({ judul, daftar }) {
  return (
    <nav aria-label={judul}>
      <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">
        {judul}
      </h3>
      <ul className="mt-4 space-y-2.5">
        {daftar.map((t) => (
          <li key={t.href}>
            <Link
              href={t.href}
              className="group inline-flex items-center gap-1.5 text-sm text-white/65 transition-colors duration-200 hover:text-white"
            >
              <IconArrowRight className="h-3 w-3 -translate-x-1 text-gold opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
              <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                {t.nama}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function PublicFooter({ namaDesa, jenisWilayah, wilayah, alamat, pengunjung }) {
  return (
    <footer className="relative overflow-hidden bg-gradient-to-b from-royal-dark to-navy-dark text-white">
      {/* Garis emas puncak footer, senada dengan header & hero */}
      <div className="h-[3px] w-full bg-gradient-to-r from-gold via-gold-light to-gold" />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 top-10 h-72 w-72 rounded-full bg-seablue/10 blur-3xl"
      />

      <div className="relative mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-[1.5fr_1fr_1fr] md:gap-12">
        {/* Identitas aplikasi + identitas instance desa */}
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
              <Image src="/logo-si-lipu.png" alt="Logo SI-LIPU" width={30} height={30} />
            </span>
            <div className="leading-tight">
              <p className="font-display text-xl font-semibold tracking-wide">SI-LIPU</p>
              <p className="text-xs text-white/60">
                Sistem Informasi Layanan Interaktif Pelayanan Umum
              </p>
            </div>
          </div>

          {namaDesa && (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="font-display text-base font-semibold text-gold-light">
                {jenisWilayah || "Desa"} {namaDesa}
              </p>
              {wilayah && <p className="mt-1 text-sm text-white/70">{wilayah}</p>}
              {alamat && (
                <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-white/55">
                  <IconMapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                  <span>{alamat}</span>
                </p>
              )}
            </div>
          )}
        </div>

        <KolomTautan judul="Jelajahi Desa" daftar={TAUTAN_JELAJAHI} />
        <KolomTautan judul="Panel Warga" daftar={TAUTAN_WARGA} />
      </div>

      {/* Kredit originator (wajib, lihat docs/BRANDING.md) + login petugas + pengunjung */}
      <div className="relative border-t border-white/10 bg-black/20 px-6 py-5">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="max-w-2xl text-[11px] leading-relaxed text-white/45">
            SI-LIPU dikembangkan pertama kali untuk Desa Tatakalai, Kabupaten Banggai Kepulauan —
            digagas oleh Tasrib A. Abbas, S.AP.
          </p>
          <Link
            href="/login"
            className="shrink-0 text-xs text-white/50 underline underline-offset-4 transition hover:text-gold-light"
          >
            Login admin/petugas desa
          </Link>
        </div>
        <div className="mx-auto mt-1 max-w-6xl text-center sm:text-left">
          <PengunjungBeranda awal={pengunjung} />
        </div>
      </div>
    </footer>
  );
}
