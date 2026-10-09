"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LoginButton from "@/components/LoginButton";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_CONFIG_DESA } from "@/lib/configDesa";

// Menu utama header publik. `href` kosong = fitur belum ada kodenya,
// ditampilkan sebagai label nonaktif — supaya warga tahu fitur itu memang
// direncanakan, bukan link mati/salah.
// `pendek` = label ringkas dipakai di layar sedang (lg) agar semua menu
// muat sejajar dengan nama desa; layar lebar (xl) memakai `nama` penuh.
const MENU = [
  { nama: "Beranda", pendek: "Beranda", href: "/" },
  // Satu menu untuk semua fitur warga. Ajukan Layanan, Cek Status, dan
  // Riwayat Ajuan kini berupa tab di dalam panel (lihat PanelWargaTabs).
  { nama: "Panel Warga", pendek: "Panel Warga", href: "/layanan" },
  { nama: "Galeri Kegiatan", pendek: "Galeri", href: "/galeri" },
  { nama: "Pendaftaran Kadus/RT", pendek: "Kadus/RT", href: "/pendaftaran" },
  { nama: "Pengumuman Desa", pendek: "Pengumuman", href: null },
  { nama: "Profil Desa", pendek: "Profil", href: null },
];

// Menu aktif bila path sama persis atau berada di bawahnya. "Panel Warga"
// ("/layanan") otomatis aktif di semua halaman panel: ajukan, cek status,
// dan riwayat. Kalau suatu saat ada menu lain di bawah path yang sama, yang
// lebih spesifik didahulukan.
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
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const stripRef = useRef(null);
  // Header ini dipakai di banyak halaman publik, sebagian di antaranya
  // Client Component tanpa akses langsung ke Server Component — jadi
  // identitas desa diambil di sini, di sisi browser, lewat Supabase client
  // (RLS sudah izinkan publik baca config_desa, lihat 0010_config_desa.sql).
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

  // Bayangan halus muncul begitu halaman mulai discroll.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Di HP, baris menu bisa digeser. Saat pindah halaman, geser otomatis
  // supaya menu yang aktif berada di tengah dan selalu terlihat.
  useEffect(() => {
    const strip = stripRef.current;
    const aktif = strip?.querySelector('[data-aktif="true"]');
    if (!strip || !aktif) return;
    strip.scrollTo({
      left: aktif.offsetLeft - (strip.clientWidth - aktif.offsetWidth) / 2,
      behavior: "smooth",
    });
  }, [pathname]);

  return (
    <header
      className={`sticky top-0 z-40 border-b bg-white/95 backdrop-blur transition-shadow duration-300 ${
        scrolled ? "border-slate-200/80 shadow-[0_1px_16px_-4px_rgba(11,44,107,0.18)]" : "border-transparent"
      }`}
    >
      {/* Garis emas tipis di puncak header — aksen "kop surat", konsisten dengan hero. */}
      <div className="h-[3px] w-full bg-gradient-to-r from-gold via-gold-light to-gold" />

      <div className="mx-auto flex max-w-7xl items-center gap-4 px-5 py-3 sm:px-6">
        {/* shrink-0: nama desa TIDAK BOLEH ikut menyempit demi memberi ruang
            ke menu di sebelahnya. */}
        <Link href="/" className="group flex shrink-0 items-center gap-2.5">
          {/* Logo desa kalau sudah diunggah admin lewat /dashboard/pengaturan-desa,
              kalau belum tetap logo aplikasi SI-LIPU sebagai identitas bawaan. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={config.logo_url || "/logo-si-lipu.png"}
            alt={config.logo_url ? "Logo desa" : "Logo SI-LIPU"}
            width={40}
            height={40}
            className="h-9 w-9 shrink-0 rounded-full object-contain ring-1 ring-navy/10 transition group-hover:ring-gold/60 sm:h-10 sm:w-10"
          />
          <span className="leading-tight">
            <span className="block max-w-[190px] truncate font-display text-[14px] font-semibold tracking-wide text-navy sm:max-w-[320px] sm:text-[15px]">
              {config.nama_desa
                ? `${config.jenis_wilayah || "Desa"} ${config.nama_desa}`
                : "SI-LIPU"}
            </span>
            {/* Subtitle disembunyikan di layar sedang (lg) agar menu muat
                sejajar; muncul lagi di layar lebar (xl). */}
            <span className="hidden max-w-[320px] truncate font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400 sm:block lg:hidden xl:block">
              {config.nama_desa ? "Portal Layanan Digital Desa" : "Sistem Informasi Layanan Interaktif"}
            </span>
          </span>
        </Link>

        {/* Menu desktop (≥1024px) — kapsul abu-abu lembut, menu aktif
            tampil sebagai pil navy. Saat kursor diarahkan, menu membesar
            halus (scale 110%) dan latarnya berubah. Menu "segera hadir" hanya ditampilkan
            di layar xl supaya di lg semua menu aktif tetap muat sejajar. */}
        <nav
          aria-label="Menu utama"
          className="ml-auto hidden items-center gap-0.5 rounded-full bg-slate-100/80 p-1 ring-1 ring-slate-200/70 lg:flex"
        >
          {MENU.map((item) => {
            const aktif = menuAktif(item.href, pathname);
            const label = (
              <>
                <span className="xl:hidden">{item.pendek}</span>
                <span className="hidden xl:inline">{item.nama}</span>
              </>
            );
            return item.href ? (
              <Link
                key={item.nama}
                href={item.href}
                aria-current={aktif ? "page" : undefined}
                className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all duration-300 ease-out hover:scale-110 motion-reduce:transform-none xl:px-4 ${
                  aktif
                    ? "bg-navy text-white shadow-sm shadow-navy/30 hover:bg-navy-light hover:shadow-md hover:shadow-navy/40"
                    : "text-slate-600 hover:bg-white hover:text-navy hover:shadow-md hover:shadow-navy/15 hover:ring-1 hover:ring-gold/50"
                }`}
              >
                {label}
              </Link>
            ) : (
              <span
                key={item.nama}
                title="Segera hadir"
                className="hidden cursor-not-allowed whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-medium text-slate-300 xl:inline"
              >
                {label}
              </span>
            );
          })}
        </nav>

        {/* Login — selalu terlihat di semua ukuran layar. */}
        <LoginButton className="ml-auto shrink-0 rounded-full bg-gradient-to-r from-gold to-gold-light px-5 py-2 text-[13px] font-semibold text-navy-dark shadow-[0_6px_18px_-6px_rgba(232,185,51,0.8)] transition hover:brightness-105 hover:shadow-[0_8px_22px_-6px_rgba(232,185,51,0.9)] lg:ml-0">
          Login
        </LoginButton>
      </div>

      {/* Menu HP/tablet (<1024px) — baris pil yang bisa digeser ke samping,
          langsung terlihat tanpa perlu membuka hamburger. Bayangan putih di
          kanan memberi petunjuk bahwa masih ada menu di sebelahnya. */}
      <div className="relative border-t border-slate-100 lg:hidden">
        <nav
          ref={stripRef}
          aria-label="Menu utama"
          className="relative flex gap-2 overflow-x-auto px-5 py-2.5 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {MENU.map((item) => {
            const aktif = menuAktif(item.href, pathname);
            return item.href ? (
              <Link
                key={item.nama}
                href={item.href}
                data-aktif={aktif ? "true" : undefined}
                aria-current={aktif ? "page" : undefined}
                className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition ${
                  aktif
                    ? "border-navy bg-navy text-white shadow-sm shadow-navy/25"
                    : "border-slate-200 bg-white text-slate-600 active:bg-slate-50"
                }`}
              >
                {item.nama}
              </Link>
            ) : (
              <span
                key={item.nama}
                className="shrink-0 whitespace-nowrap rounded-full border border-dashed border-slate-200 px-3.5 py-1.5 text-[13px] font-medium text-slate-300"
              >
                {item.nama}
              </span>
            );
          })}
          <span className="w-4 shrink-0" aria-hidden />
        </nav>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white to-transparent" />
      </div>
    </header>
  );
}
