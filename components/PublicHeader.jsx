"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LoginButton from "@/components/LoginButton";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_CONFIG_DESA } from "@/lib/configDesa";

// Menu utama header publik. Dibuat berkelompok supaya tetap rapi walau fitur
// bertambah: menu yang paling sering dipakai warga tampil langsung, menu
// pendukung masuk ke dropdown (`anak`). Menu baru? Taruh di `anak` milik
// "Informasi Desa" — header tidak melebar. `href` kosong = fitur belum ada,
// ditampilkan sebagai label nonaktif ("segera hadir").
// `pendek` = label ringkas di layar sedang (lg); layar lebar (xl) pakai `nama`.
const MENU = [
  { nama: "Beranda", pendek: "Beranda", href: "/" },
  // Satu menu untuk semua fitur warga (Ajukan Layanan, Cek Status, Riwayat).
  { nama: "Panel Warga", pendek: "Panel Warga", href: "/layanan" },
  { nama: "Wisata", pendek: "Wisata", href: "/wisata" },
  {
    nama: "Informasi Desa",
    pendek: "Informasi",
    anak: [
      { nama: "Profil Desa", href: "/profil", deskripsi: "Sejarah, visi-misi, dan wilayah" },
      { nama: "Galeri Kegiatan", href: "/galeri", deskripsi: "Foto kegiatan dan acara desa" },
      { nama: "Pengumuman Desa", href: null, deskripsi: "Segera hadir" },
    ],
  },
  { nama: "Pendaftaran Kadus/RT", pendek: "Kadus/RT", href: "/pendaftaran" },
];

// Daftar datar semua tautan (menu biasa + isi dropdown). Dipakai untuk
// penentuan menu aktif dan baris menu di HP (yang tidak pakai dropdown).
const SEMUA_LINK = MENU.flatMap((m) => m.anak ?? [m]);

// Menu aktif bila path sama persis atau berada di bawahnya. "Panel Warga"
// ("/layanan") otomatis aktif di semua halaman panel. Kalau suatu saat ada
// menu lain di bawah path yang sama, yang lebih spesifik didahulukan.
function menuAktif(href, pathname) {
  if (!href || !pathname) return false;
  if (href === "/") return pathname === "/";
  const lainCocokLebihSpesifik = SEMUA_LINK.some(
    (m) => m.href && m.href !== href && m.href.startsWith(href + "/") && (pathname === m.href || pathname.startsWith(m.href + "/"))
  );
  if (lainCocokLebihSpesifik) return false;
  return pathname === href || pathname.startsWith(href + "/");
}

// Menu dengan dropdown (desktop). Terbuka saat kursor lewat / diklik /
// difokus keyboard; tertutup saat pindah halaman, klik di luar, atau Esc.
// Panel selalu berlatar putih supaya terbaca di tema header gelap maupun terang.
function MenuDropdown({ item, aktif, tema, pathname, onSorot }) {
  const [buka, setBuka] = useState(false);
  const ref = useRef(null);

  useEffect(() => setBuka(false), [pathname]);

  useEffect(() => {
    if (!buka) return;
    const luar = (e) => {
      if (!ref.current?.contains(e.target)) setBuka(false);
    };
    const esc = (e) => {
      if (e.key === "Escape") setBuka(false);
    };
    document.addEventListener("pointerdown", luar);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", luar);
      document.removeEventListener("keydown", esc);
    };
  }, [buka]);

  return (
    <div
      ref={ref}
      data-aktif={aktif ? "true" : undefined}
      className="relative z-10"
      onMouseEnter={(e) => {
        onSorot(e);
        setBuka(true);
      }}
      onMouseLeave={() => setBuka(false)}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={buka}
        onClick={() => setBuka((v) => !v)}
        className={`flex items-center gap-1 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-300 xl:px-4 ${
          aktif ? tema.menuAktif : tema.menuBiasa
        }`}
      >
        <span className="xl:hidden">{item.pendek}</span>
        <span className="hidden xl:inline">{item.nama}</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden
          className={`h-3 w-3 transition-transform duration-200 ${buka ? "rotate-180" : ""}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {buka && (
        // pt-3 = jembatan tak kasat mata agar kursor tidak "putus" saat turun ke panel.
        <div className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3">
          <div
            role="menu"
            className="w-64 rounded-2xl bg-white p-1.5 shadow-xl shadow-navy/20 ring-1 ring-slate-200"
          >
            {item.anak.map((a) => {
              const anakAktif = menuAktif(a.href, pathname);
              return a.href ? (
                <Link
                  key={a.nama}
                  href={a.href}
                  role="menuitem"
                  className={`block rounded-xl px-3.5 py-2.5 transition hover:bg-slate-50 ${
                    anakAktif ? "bg-navy/5" : ""
                  }`}
                >
                  <span className={`block text-sm font-medium ${anakAktif ? "text-navy" : "text-slate-700"}`}>
                    {a.nama}
                  </span>
                  <span className="block text-xs text-slate-400">{a.deskripsi}</span>
                </Link>
              ) : (
                <div key={a.nama} role="menuitem" aria-disabled className="cursor-not-allowed rounded-xl px-3.5 py-2.5 opacity-60">
                  <span className="block text-sm font-medium text-slate-500">{a.nama}</span>
                  <span className="block text-xs text-slate-400">{a.deskripsi}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PublicHeader() {
  const [scrolled, setScrolled] = useState(false);
  // true selama header masih berada di atas foto hero beranda (tema gelap).
  const [diHero, setDiHero] = useState(true);
  const pathname = usePathname();
  const stripRef = useRef(null);
  const headerRef = useRef(null);
  const navRef = useRef(null);
  // Posisi penanda menu: pil aktif (solid) & pil sorot saat kursor lewat.
  const [posAktif, setPosAktif] = useState(null);
  const [posSorot, setPosSorot] = useState(null);
  const [animasiNav, setAnimasiNav] = useState(false);
  // Header ini dipakai di banyak halaman publik, sebagian di antaranya
  // Client Component tanpa akses langsung ke Server Component — jadi
  // identitas desa diambil di sini, di sisi browser, lewat Supabase client
  // (RLS sudah izinkan publik baca config_desa, lihat 0010_config_desa.sql).
  const [config, setConfig] = useState(DEFAULT_CONFIG_DESA);

  // Di beranda header MENGAMBANG di atas hero (tidak memakan ruang), jadi
  // kaca transparannya benar-benar memperlihatkan foto di belakangnya.
  // Di halaman lain header tetap di alur biasa (sticky).
  const adaBeranda = pathname === "/";
  const gelap = adaBeranda && diHero;

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

  // Saat discroll: kaca sedikit menebal, dan (di beranda) tema header
  // berganti dari gelap (di atas hero) ke terang (setelah hero lewat).
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 4);
      if (adaBeranda) {
        const hero = document.getElementById("hero-beranda");
        const tinggiHeader = headerRef.current?.offsetHeight ?? 72;
        setDiHero(hero ? hero.getBoundingClientRect().bottom > tinggiHeader : false);
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [adaBeranda]);

  // Beritahu halaman berapa tinggi header (CSS variable --header-h) supaya
  // isi hero di beranda mulai tepat di bawah header yang mengambang.
  useEffect(() => {
    const el = headerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const set = () =>
      document.documentElement.style.setProperty("--header-h", `${el.offsetHeight}px`);
    const ro = new ResizeObserver(set);
    ro.observe(el);
    set();
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty("--header-h");
    };
  }, []);

  // Ukur posisi menu aktif untuk pil penanda yang bergeser halus.
  const ukurAktif = useCallback(() => {
    const aktif = navRef.current?.querySelector('[data-aktif="true"]');
    setPosAktif(aktif && aktif.offsetWidth > 0 ? { x: aktif.offsetLeft, w: aktif.offsetWidth } : null);
  }, []);

  useEffect(() => {
    ukurAktif();
    // Aktifkan transisi geser SETELAH ukuran pertama, supaya pil tidak
    // meluncur dari kiri saat halaman baru dimuat.
    const id = requestAnimationFrame(() => setAnimasiNav(true));
    const nav = navRef.current;
    let ro;
    if (nav && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(ukurAktif);
      ro.observe(nav);
    }
    document.fonts?.ready?.then(ukurAktif);
    return () => {
      cancelAnimationFrame(id);
      ro?.disconnect();
    };
  }, [pathname, ukurAktif]);

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

  const sorotMenu = (e) =>
    setPosSorot({ x: e.currentTarget.offsetLeft, w: e.currentTarget.offsetWidth });

  // Kelas tema (gelap = di atas hero, terang = selain itu).
  const tema = gelap
    ? {
        header: scrolled
          ? "border-white/20 bg-navy-dark/35 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.55)]"
          : "border-white/15 bg-navy-dark/15",
        nama: "text-white",
        subjudul: "text-white/60",
        kapsul:
          "bg-white/10 ring-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_28px_-14px_rgba(0,0,0,0.6)]",
        pilAktif:
          "bg-gradient-to-b from-gold-light to-gold shadow-[0_4px_16px_-4px_rgba(232,185,51,0.75),inset_0_1px_0_rgba(255,255,255,0.55)]",
        pilSorot: "bg-white/15 ring-1 ring-white/30",
        menuAktif: "text-navy-dark",
        menuBiasa: "text-white/80 hover:text-white",
        menuMati: "text-white/35",
        garisBawah: "via-white/40",
        stripBatas: "border-white/10",
        chipBiasa: "border-white/20 bg-white/10 text-white/85 active:bg-white/20",
        chipAktif:
          "border-gold bg-gradient-to-b from-gold-light to-gold text-navy-dark shadow-sm shadow-gold/30",
        chipMati: "border-white/20 text-white/35",
        ring: "ring-white/30 group-hover:ring-gold/70",
      }
    : {
        header: scrolled
          ? "border-slate-200/70 bg-white/75 shadow-[0_8px_30px_-12px_rgba(11,44,107,0.28)]"
          : "border-white/60 bg-white/60",
        nama: "text-navy",
        subjudul: "text-slate-400",
        kapsul:
          "bg-white/55 ring-slate-300/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_22px_-14px_rgba(11,44,107,0.35)]",
        pilAktif:
          "bg-gradient-to-b from-navy-light to-navy shadow-[0_6px_16px_-6px_rgba(11,44,107,0.65),inset_0_1px_0_rgba(255,255,255,0.18)]",
        pilSorot: "bg-white/90 ring-1 ring-gold/50 shadow-md shadow-navy/10",
        menuAktif: "text-white",
        menuBiasa: "text-slate-600 hover:text-navy",
        menuMati: "text-slate-300",
        garisBawah: "via-gold/50",
        stripBatas: "border-slate-200/60",
        chipBiasa: "border-slate-200/80 bg-white/70 text-slate-600 active:bg-white",
        chipAktif: "border-navy bg-navy text-white shadow-sm shadow-navy/25",
        chipMati: "border-slate-200 text-slate-300",
        ring: "ring-navy/10 group-hover:ring-gold/60",
      };

  const gesekPil = `pointer-events-none absolute inset-y-1 left-0 rounded-full ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
    animasiNav ? "transition-[transform,width,opacity,background-color] duration-500" : "transition-none"
  }`;

  return (
    // Pembungkus sticky. Di beranda tingginya 0 sehingga header (absolute di
    // dalamnya) mengambang DI ATAS hero tanpa mendorong isi halaman.
    <div className={`sticky top-0 z-40 ${adaBeranda ? "h-0" : ""}`}>
      <header
        ref={headerRef}
        className={`${
          adaBeranda ? "absolute inset-x-0 top-0" : "relative"
        } border-b backdrop-blur-xl backdrop-saturate-150 transition-[background-color,border-color,box-shadow] duration-500 ${tema.header}`}
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
              className={`h-10 w-10 shrink-0 rounded-full bg-white/80 object-contain ring-1 transition duration-500 sm:h-11 sm:w-11 ${tema.ring}`}
            />
            <span className="leading-tight">
              <span
                className={`block max-w-[170px] line-clamp-2 font-display text-[16px] font-semibold leading-tight tracking-wide transition-colors duration-500 sm:line-clamp-none sm:max-w-[320px] sm:truncate sm:text-[19px] lg:max-w-[260px] lg:text-[18px] xl:max-w-[270px] xl:text-[20px] ${tema.nama}`}
              >
                {config.nama_desa
                  ? `${config.jenis_wilayah || "Desa"} ${config.nama_desa}`
                  : "SI-LIPU"}
              </span>
              {/* Subtitle disembunyikan di layar sedang (lg) agar menu muat
                  sejajar; muncul lagi di layar lebar (xl). */}
              <span
                className={`hidden max-w-[320px] truncate font-mono text-[11px] uppercase tracking-[0.16em] transition-colors duration-500 sm:block lg:hidden xl:block ${tema.subjudul}`}
              >
                {config.nama_desa ? "Portal Layanan Digital Desa" : "Sistem Informasi Layanan Interaktif"}
              </span>
            </span>
          </Link>

          {/* Menu desktop (≥1024px) — kapsul kaca. Pil solid (emas di atas hero,
              navy di bagian terang) menandai menu aktif; pil kaca kedua
              mengikuti kursor dengan gerak meluncur. Menu "segera hadir" hanya
              tampil di layar xl supaya di lg semua menu aktif tetap muat. */}
          <nav
            ref={navRef}
            aria-label="Menu utama"
            onMouseLeave={() => setPosSorot(null)}
            className={`relative ml-auto hidden items-center gap-0.5 rounded-full p-1 ring-1 backdrop-blur-md transition-[background-color,box-shadow] duration-500 lg:flex ${tema.kapsul}`}
          >
            <span
              aria-hidden
              className={`${gesekPil} ${tema.pilSorot}`}
              style={{
                width: posSorot?.w ?? 0,
                transform: `translateX(${posSorot?.x ?? 0}px)`,
                opacity: posSorot && posSorot.x !== posAktif?.x ? 1 : 0,
              }}
            />
            <span
              aria-hidden
              className={`${gesekPil} ${tema.pilAktif}`}
              style={{
                width: posAktif?.w ?? 0,
                transform: `translateX(${posAktif?.x ?? 0}px)`,
                opacity: posAktif ? 1 : 0,
              }}
            />
            {MENU.map((item) => {
              if (item.anak) {
                return (
                  <MenuDropdown
                    key={item.nama}
                    item={item}
                    aktif={item.anak.some((a) => menuAktif(a.href, pathname))}
                    tema={tema}
                    pathname={pathname}
                    onSorot={sorotMenu}
                  />
                );
              }
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
                  data-aktif={aktif ? "true" : undefined}
                  aria-current={aktif ? "page" : undefined}
                  onMouseEnter={sorotMenu}
                  onFocus={sorotMenu}
                  onBlur={() => setPosSorot(null)}
                  className={`relative z-10 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-300 xl:px-4 ${
                    aktif ? tema.menuAktif : tema.menuBiasa
                  }`}
                >
                  {label}
                </Link>
              ) : (
                <span
                  key={item.nama}
                  title="Segera hadir"
                  className={`relative z-10 hidden cursor-not-allowed whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-medium xl:inline ${tema.menuMati}`}
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

        {/* Menu HP/tablet (<1024px) — baris pil kaca yang bisa digeser ke samping,
            langsung terlihat tanpa perlu membuka hamburger. Ujung kanan memudar
            (mask) sebagai petunjuk masih ada menu di sebelahnya. */}
        <div className={`relative border-t transition-colors duration-500 lg:hidden ${tema.stripBatas}`}>
          <nav
            ref={stripRef}
            aria-label="Menu utama"
            className="relative flex gap-2 overflow-x-auto px-5 py-2.5 sm:px-6 [mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {SEMUA_LINK.map((item) => {
              const aktif = menuAktif(item.href, pathname);
              return item.href ? (
                <Link
                  key={item.nama}
                  href={item.href}
                  data-aktif={aktif ? "true" : undefined}
                  aria-current={aktif ? "page" : undefined}
                  className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-medium backdrop-blur-sm transition-colors duration-300 ${
                    aktif ? tema.chipAktif : tema.chipBiasa
                  }`}
                >
                  {item.nama}
                </Link>
              ) : (
                <span
                  key={item.nama}
                  className={`shrink-0 whitespace-nowrap rounded-full border border-dashed px-3.5 py-1.5 text-[13px] font-medium ${tema.chipMati}`}
                >
                  {item.nama}
                </span>
              );
            })}
            <span className="w-4 shrink-0" aria-hidden />
          </nav>
        </div>

        {/* Garis cahaya halus di tepi bawah kaca. */}
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent to-transparent transition-colors duration-500 ${tema.garisBawah}`}
        />
      </header>
    </div>
  );
}
