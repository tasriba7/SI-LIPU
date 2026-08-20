"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  { nama: "Pendaftaran Kadus/RT", href: "/pendaftaran" },
  { nama: "Pengumuman Desa", href: null },
  { nama: "Profil Desa", href: null },
];

export default function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
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

  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          {/* Logo desa kalau sudah diunggah admin lewat /dashboard/pengaturan-desa,
              kalau belum tetap logo aplikasi SI-LIPU sebagai identitas bawaan. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={config.logo_url || "/logo-si-lipu.png"}
            alt={config.logo_url ? "Logo desa" : "Logo SI-LIPU"}
            width={28}
            height={28}
            className="h-7 w-7 shrink-0 rounded object-contain"
          />
          <span className="truncate font-display text-sm font-semibold tracking-wide text-navy">
            SI-LIPU
            {config.nama_desa && (
              <span className="uppercase"> - {config.jenis_wilayah || "Desa"} {config.nama_desa}</span>
            )}
          </span>
        </Link>

        {/* Menu desktop */}
        <nav className="hidden items-center gap-6 md:flex">
          {MENU.map((item) =>
            item.href ? (
              <Link
                key={item.nama}
                href={item.href}
                className="text-sm text-slate-500 transition hover:text-navy"
              >
                {item.nama}
              </Link>
            ) : (
              <span
                key={item.nama}
                className="cursor-not-allowed text-sm text-slate-300"
                title="Segera hadir"
              >
                {item.nama}
              </span>
            )
          )}
          <LoginButton className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white transition hover:bg-navy-light">
            Login
          </LoginButton>
        </nav>

        {/* Tombol menu mobile */}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="text-slate-500 md:hidden"
          aria-label="Buka menu"
        >
          {menuOpen ? <IconClose className="h-6 w-6" /> : <IconMenu className="h-6 w-6" />}
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
          menuOpen ? "flex" : "hidden"
        } flex-col gap-1 border-t border-slate-100 bg-white px-6 py-4 md:hidden`}
      >
        {MENU.map((item) =>
          item.href ? (
            <Link
              key={item.nama}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-2 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              {item.nama}
            </Link>
          ) : (
            <span
              key={item.nama}
              className="flex items-center gap-2 px-2 py-2.5 text-sm text-slate-300"
            >
              {item.nama}
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-400">
                Segera hadir
              </span>
            </span>
          )
        )}
        <LoginButton
          onOpen={() => setMenuOpen(false)}
          className="mt-2 rounded-lg bg-navy px-4 py-2.5 text-center text-sm font-medium text-white"
        >
          Login
        </LoginButton>
      </nav>
    </header>
  );
}
