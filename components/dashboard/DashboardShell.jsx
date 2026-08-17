"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  IconMenu,
  IconClose,
  IconHome,
  IconMail,
  IconMessage,
  IconMegaphone,
  IconUsers,
  IconLogout,
} from "@/components/icons";
import { ROLE_BADGE_CLASS, labelJabatan } from "@/lib/roles";

const MODUL_LAYANAN = [
  { nama: "Pengajuan Surat", icon: IconMail, href: "/dashboard/surat" },
  { nama: "Pengaduan Warga", icon: IconMessage },
  { nama: "Pengumuman Desa", icon: IconMegaphone },
  { nama: "Data Kependudukan", icon: IconUsers },
];

function sapaanWaktu(jam) {
  if (jam < 10) return "Selamat pagi";
  if (jam < 15) return "Selamat siang";
  if (jam < 18) return "Selamat sore";
  return "Selamat malam";
}

export default function DashboardShell({ profile, logoutAction, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sapaan, setSapaan] = useState("Selamat datang");

  useEffect(() => {
    setSapaan(sapaanWaktu(new Date().getHours()));
  }, []);

  const badgeClass =
    ROLE_BADGE_CLASS[profile?.role] ?? "bg-white/10 text-white/70";

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      {/* Overlay khusus mobile saat sidebar terbuka */}
      {sidebarOpen && (
        <button
          aria-label="Tutup menu"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-navy-dark transition-transform duration-200 md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <Image
            src="/logo-si-lipu.png"
            alt="Logo SI-LIPU"
            width={36}
            height={36}
          />
          <div>
            <p className="text-sm font-bold leading-none text-white">
              SI-LIPU
            </p>
            <p className="mt-1 text-[11px] leading-none text-white/50">
              Panel Perangkat Desa
            </p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto text-white/60 md:hidden"
            aria-label="Tutup menu"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg bg-white/10 px-3 py-2.5 text-sm font-medium text-white"
          >
            <IconHome className="h-4 w-4" />
            Dashboard
          </Link>

          <p className="mb-2 mt-6 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">
            Modul layanan
          </p>
          <ul className="space-y-1">
            {MODUL_LAYANAN.map(({ nama, icon: Icon, href }) =>
              href ? (
                <li key={nama}>
                  <Link
                    href={href}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1">{nama}</span>
                  </Link>
                </li>
              ) : (
                <li key={nama}>
                  <div className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/40">
                    <Icon className="h-4 w-4" />
                    <span className="flex-1">{nama}</span>
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px]">
                      segera
                    </span>
                  </div>
                </li>
              )
            )}
          </ul>
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="mb-2 rounded-lg bg-white/5 px-3 py-2.5">
            <p className="truncate text-sm font-medium text-white">
              {profile?.nama}
            </p>
            <span
              className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${badgeClass}`}
            >
              {labelJabatan(profile)}
            </span>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white"
            >
              <IconLogout className="h-4 w-4" />
              Keluar
            </button>
          </form>
        </div>
      </aside>

      {/* Konten utama */}
      <div className="flex min-h-screen flex-1 flex-col md:ml-64">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-500 md:hidden"
            aria-label="Buka menu"
          >
            <IconMenu className="h-5 w-5" />
          </button>
          <div>
            <p className="text-sm font-medium text-slate-800">
              {sapaan}, {profile?.nama?.split(" ")[0]}
            </p>
            <p className="text-xs text-slate-400">
              Panel {labelJabatan(profile)} — Desa
            </p>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
