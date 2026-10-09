"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Bilah tab "Panel Warga" — menyatukan tiga fitur warga (Ajukan Layanan,
// Cek Status, Riwayat Ajuan) dalam satu panel. Dipasang oleh
// app/(publik)/layanan/layout.js sehingga tampil di semua halaman panel.
//
// Alamat halaman SENGAJA tidak diubah (/layanan, /layanan/cek,
// /layanan/riwayat) agar tautan lama yang sudah terlanjur dibagikan ke warga
// tetap berfungsi.
const TAB = [
  {
    nama: "Ajukan Layanan",
    href: "/layanan",
    // Beranda panel + form pengajuan + alur surat lama (/layanan/surat).
    aktif: (p) =>
      p === "/layanan" ||
      p.startsWith("/layanan/ajukan") ||
      p === "/layanan/surat",
  },
  {
    nama: "Cek Status",
    href: "/layanan/cek",
    aktif: (p) => p.startsWith("/layanan/cek") || p.startsWith("/layanan/surat/cek"),
  },
  {
    nama: "Riwayat Ajuan",
    href: "/layanan/riwayat",
    aktif: (p) => p.startsWith("/layanan/riwayat"),
  },
];

export default function PanelWargaTabs() {
  const pathname = usePathname() || "";

  return (
    <nav
      aria-label="Panel Warga"
      className="mx-auto flex max-w-md items-center gap-0.5 overflow-x-auto rounded-full bg-slate-100/90 p-1 ring-1 ring-slate-200/70 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {TAB.map((t) => {
        const aktif = t.aktif(pathname);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={aktif ? "page" : undefined}
            className={`flex-1 whitespace-nowrap rounded-full px-3 py-2 text-center text-[13px] font-medium transition-all duration-200 ${
              aktif
                ? "bg-navy text-white shadow-sm shadow-navy/30"
                : "text-slate-600 hover:bg-white hover:text-navy hover:shadow-sm"
            }`}
          >
            {t.nama}
          </Link>
        );
      })}
    </nav>
  );
}
