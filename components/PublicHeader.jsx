"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconMenu, IconClose } from "@/components/icons";
import LoginButton from "@/components/LoginButton";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_CONFIG_DESA } from "@/lib/configDesa";

// Menu utama header publik. `href` kosong = fitur belum ada kodenya,
// ditampilkan sebagai label nonaktif "Segera hadir" — supaya warga tahu
// fitur itu memang direncanakan, bukan link mati/salah.
const MENU = [
  { nama: "Beranda", href: "/" },
  { nama: "Ajukan Layanan", href: "/layanan" },
  { nama: "Cek Status", href: "/layanan/cek" },
  { nama: "Galeri Kegiatan", href: "/galeri" },
  { nama: "Pendaftaran Kadus/RT", href: "/pendaftaran" },
  { nama: "Pengumuman Desa", href: null },
  { nama: "Profil Desa", href: null },
];

// "Cek Status" ("/layanan/cek") berada di bawah "/layanan" secara path,
// jadi dicek dulu sebelum "Ajukan Layanan" — supaya keduanya tidak
// sama-sama tersorot aktif saat warga sedang di halaman cek status.
function menuAktif(href, pathname) {
  if (!href || !pathname) return false;
  if (href === "/") return pathname === "/";
  const lainCocokLebihSpesifik = MENU.some(
    (m) => m.href && m.href !== href && m.href.startsWith(href + "/") && (pathname === m.href || pathname.startsWith(m.href + "/"))
  );
  if (lainCocokLebihSpesifik) return false;
  return pathname === href || pathname.startsWith(href + "/");
}

export default function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  // Header ini dipakai di banyak halaman publik, sebagian di antaranya
  // Client Component tanpa akses langsung ke Server Component (lihat
  // app/layanan/surat/page.js dkk) — jadi identitas desa diambil di sini,
  // di sisi browser, lewat Supabase client (RLS sudah izinkan publik baca
  // config_desa, lihat supabase/migrations/0010_config_desa.sql).
  const [config, setConfig] = useState(DEFAULT_CONFIG_DESA);

  useEffect(() => {
    let batal = false;
    const supabase = createClient();
    supabase
      .from("config_desa")
      .select("nama_desa, jenis_wilayah, logo_url")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        if (!batal && data) setConfig((c) => ({ ...c, ...data }));
      });
    return () => {
      batal = true;
    };
  }, []);

  // Bayangan halus muncul begitu halaman mulai discroll — supaya header
  // tetap terasa "menempel" di atas latar hero yang gelap tanpa perlu
  // garis tebal yang keras saat masih di posisi paling atas.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Tutup drawer mobile otomatis kalau lebar layar melewati breakpoint
  // desktop (mis. rotasi tablet) supaya tidak "nyangkut" kebuka.
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setMenuOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 border-b bg-white/95 backdrop-blur transition-shadow duration-300 ${
        scrolled ? "border-slate-200/80 shadow-[0_1px_16px_-4px_rgba(11,44,107,0.18)]" : "border-transparent"
      }`}
    >
      {/* Garis emas tipis di puncak header — konsisten dengan aksen "kop
          surat" yang dipakai di hero, sekaligus penanda identitas resmi desa. */}
      <div className="h-[3px] w-full bg-gradient-to-r from-gold via-gold-light to-gold" />

      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-6">
        <Link href="/" className="group flex min-w-0 shrink items-center gap-2.5">
          {/* Logo desa kalau sudah diunggah admin lewat /dashboard/pengaturan-desa,
              kalau belum tetap logo aplikasi SI-LIPU sebagai identitas bawaan. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={config.logo_url || "/logo-si-lipu.png"}
            alt={config.logo_url ? "Logo desa" : "Logo SI-LIPU"}
            width={34}
            height={34}
            className="h-8 w-8 shrink-0 rounded-full object-contain ring-1 ring-navy/10 transition group-hover:ring-gold/60 sm:h-9 sm:w-9"
          />
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-display text-[13.5px] font-semibold tracking-wide text-navy sm:text-sm">
              {config.nama_desa
                ? `${config.jenis_wilayah || "Desa"} ${config.nama_desa}`
                : "SI-LIPU"}
            </span>
            <span className="block truncate font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
              {config.nama_desa ? "Portal Layanan Digital Desa" : "Sistem Informasi Layanan Interaktif"}
            </span>
          </span>
        </Link>

        {/* Menu desktop — baru pindah ke tata letak baris tunggal di layar
            lebar (lg) supaya tujuh label menu tidak terpotong dua baris,
            yang sebelumnya bikin header jadi tinggi dan mendorong judul
            hero turun terlalu jauh di layar pendek. */}
        <nav className="hidden items-center gap-1 lg:flex">
          {MENU.map((item) => {
            const aktif = menuAktif(item.href, pathname);
            return item.href ? (
              <Link
                key={item.nama}
                href={item.href}
                className={`group relative whitespace-nowrap rounded-md px-3 py-2 text-[13px] font-medium tracking-wide transition-colors ${
                  aktif ? "text-navy" : "text-slate-500 hover:text-navy"
                }`}
              >
                {item.nama}
                <span
                  className={`absolute inset-x-3 -bottom-[1px] h-[2px] rounded-full bg-gold transition-transform duration-200 ${
                    aktif ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  }`}
                />
              </Link>
            ) : (
              <span
                key={item.nama}
                className="cursor-not-allowed whitespace-nowrap rounded-md px-3 py-2 text-[13px] font-medium tracking-wide text-slate-300"
                title="Segera hadir"
              >
                {item.nama}
              </span>
            );
          })}
          <LoginButton className="ml-2 rounded-full bg-navy px-5 py-2 text-[13px] font-semibold text-white shadow-sm shadow-navy/20 transition hover:bg-navy-light hover:shadow-md hover:shadow-navy/25">
            Login
          </LoginButton>
        </nav>

        {/* Tombol menu mobile/tablet */}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-navy transition hover:bg-navy/5 lg:hidden"
          aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <IconClose className="h-5 w-5" /> : <IconMenu className="h-5 w-5" />}
        </button>
      </div>

      {/* Menu mobile (dropdown). Selalu di-render (bukan {menuOpen && ...})
          dan hanya disembunyikan lewat class "hidden" — supaya LoginButton
          di dalamnya (dan LoginModal di baliknya) tidak ikut dibongkar dari
          DOM saat menu ditutup otomatis ketika tombol Login ditekan. Kalau
          di-unmount, permintaan buka modal yang terjadi di render yang sama
          jadi hilang sebelum sempat tampil. */}
      <nav
        className={`${
          menuOpen ? "flex animate-fadeUp" : "hidden"
        } flex-col gap-0.5 border-t border-slate-100 bg-white px-4 py-3 shadow-lg shadow-navy/5 lg:hidden`}
      >
        {MENU.map((item) => {
          const aktif = menuAktif(item.href, pathname);
          return item.href ? (
            <Link
              key={item.nama}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center rounded-lg border-l-2 px-3 py-2.5 text-sm transition ${
                aktif
                  ? "border-gold bg-navy/[0.04] font-medium text-navy"
                  : "border-transparent text-slate-600 hover:border-gold/40 hover:bg-slate-50"
              }`}
            >
              {item.nama}
            </Link>
          ) : (
            <span
              key={item.nama}
              className="flex items-center justify-between gap-2 rounded-lg border-l-2 border-transparent px-3 py-2.5 text-sm text-slate-300"
            >
              {item.nama}
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                Segera hadir
              </span>
            </span>
          );
        })}
        <LoginButton
          onOpen={() => setMenuOpen(false)}
          className="mt-2 rounded-full bg-navy px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm shadow-navy/20"
        >
          Login
        </LoginButton>
      </nav>
    </header>
  );
}
