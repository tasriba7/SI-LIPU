"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconMenu,
  IconClose,
  IconHome,
  IconMail,
  IconMegaphone,
  IconMessage,
  IconUsers,
  IconLogout,
  IconLayers,
  IconIdCard,
  IconUserPlus,
  IconSettings,
  IconImage,
  IconKey,
  IconHeartHandshake,
} from "@/components/icons";
import { ROLE_BADGE_CLASS, bisaLihatMenu, bisaMenulis, labelJabatan } from "@/lib/roles";

// Tingkat akses tiap menu (lihat bisaLihatMenu di lib/roles.js):
//   "semua"  -> semua staf (termasuk Kadus & Ketua RT; datanya dibatasi RLS per wilayah)
//   "kantor" -> perangkat kantor desa saja (menu yang berlaku se-desa)
//   "admin"  -> hanya Administrator
// Menu tanpa `akses` dianggap "semua". Samakan dengan penjaga di layout.js
// folder halaman terkait dan di lib/akses.js.
const MODUL_LAYANAN = [
  { nama: "Pengajuan Layanan", icon: IconMail, href: "/dashboard/layanan", akses: "semua" },
  { nama: "Kelola Jenis Layanan", icon: IconLayers, href: "/dashboard/jenis-layanan", akses: "kantor" },
  { nama: "Surat Terbit", icon: IconMail, href: "/dashboard/surat-terbit", akses: "kantor" },
  { nama: "Kelola Template Surat", icon: IconLayers, href: "/dashboard/template-surat", akses: "admin" },
  { nama: "Data Kependudukan", icon: IconIdCard, href: "/dashboard/kependudukan", akses: "semua" },
  { nama: "Bantuan Desa", icon: IconHeartHandshake, href: "/dashboard/bantuan", akses: "admin" },
  { nama: "Laporan Data Warga", icon: IconMessage, href: "/dashboard/laporan-data", akses: "admin" },
  { nama: "Galeri Kegiatan", icon: IconImage, href: "/dashboard/galeri", akses: "kantor" },
  { nama: "Slot Kadus/Ketua RT", icon: IconUsers, href: "/dashboard/posisi", akses: "admin" },
  { nama: "Pendaftaran Akun", icon: IconUserPlus, href: "/dashboard/pendaftaran", akses: "admin" },
  { nama: "Pengajuan Surat (lama)", icon: IconMail, href: "/dashboard/surat", akses: "kantor" },
  { nama: "Pengumuman Desa", icon: IconMegaphone, akses: "kantor" },
];

const MODUL_PENGATURAN = [
  { nama: "Kelola Akun Staf", icon: IconKey, href: "/dashboard/kelola-akun", akses: "admin" },
  { nama: "Pengaturan Desa", icon: IconSettings, href: "/dashboard/pengaturan-desa", akses: "admin" },
];

function sapaanWaktu(jam) {
  if (jam < 10) return "Selamat pagi";
  if (jam < 15) return "Selamat siang";
  if (jam < 18) return "Selamat sore";
  return "Selamat malam";
}

export default function DashboardShell({
  profile,
  logoutAction,
  jumlahPendaftaran = 0,
  jumlahDataKurang = 0,
  jumlahPengajuanBaru = 0,
  children,
}) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Khusus layar laptop/desktop: sidebar bisa disembunyikan supaya konten lebih luas.
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [sapaan, setSapaan] = useState("Selamat datang");

  useEffect(() => {
    setSapaan(sapaanWaktu(new Date().getHours()));
  }, []);

  // Ingat pilihan sembunyi/tampil sidebar antar halaman & sesi.
  useEffect(() => {
    try {
      setSidebarHidden(localStorage.getItem("si-lipu-sidebar-hidden") === "1");
    } catch {}
  }, []);

  function toggleSidebarDesktop() {
    setSidebarHidden((v) => {
      const next = !v;
      try {
        localStorage.setItem("si-lipu-sidebar-hidden", next ? "1" : "0");
      } catch {}
      return next;
    });
  }

  // Cek ulang badge notifikasi tiap 30 detik supaya pendaftaran baru
  // muncul tanpa admin harus pindah halaman / refresh manual.
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 30000);
    return () => clearInterval(t);
  }, [router]);

  const badgeClass =
    ROLE_BADGE_CLASS[profile?.role] ?? "bg-white/10 text-white/70";

  const modulPengaturan = MODUL_PENGATURAN.filter((m) =>
    bisaLihatMenu(profile?.role, m.akses)
  );
  const modulLayanan = MODUL_LAYANAN.filter((m) =>
    bisaLihatMenu(profile?.role, m.akses)
  );
  const hanyaLihat = !bisaMenulis(profile?.role);

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
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-navy-dark transition-transform duration-200 ${
          sidebarHidden ? "md:-translate-x-full" : "md:translate-x-0"
        } ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
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
            {modulLayanan.map(({ nama, icon: Icon, href }) =>
              href ? (
                <li key={nama}>
                  <Link
                    href={href}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1">{nama}</span>
                    {href === "/dashboard/pendaftaran" && jumlahPendaftaran > 0 && (
                      <span
                        aria-label={`${jumlahPendaftaran} pendaftaran menunggu`}
                        className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white"
                      >
                        {jumlahPendaftaran > 99 ? "99+" : jumlahPendaftaran}
                      </span>
                    )}
                    {href === "/dashboard/layanan" && jumlahPengajuanBaru > 0 && (
                      <span
                        aria-label={`${jumlahPengajuanBaru} pengajuan layanan baru`}
                        title="Ada pengajuan layanan baru dari warga"
                        className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-sky-500 px-1 text-[10px] font-bold leading-none text-white"
                      >
                        {jumlahPengajuanBaru > 99 ? "99+" : jumlahPengajuanBaru}
                      </span>
                    )}
                    {href === "/dashboard/kependudukan" && jumlahDataKurang > 0 && (
                      <span
                        aria-label={`${jumlahDataKurang} data warga belum lengkap`}
                        title="Ada data warga yang belum lengkap"
                        className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-none text-white"
                      >
                        {jumlahDataKurang > 99 ? "99+" : jumlahDataKurang}
                      </span>
                    )}
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

          {modulPengaturan.length > 0 && (
            <>
              <p className="mb-2 mt-6 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                Pengaturan
              </p>
              <ul className="space-y-1">
                {modulPengaturan.map(({ nama, icon: Icon, href }) => (
                  <li key={nama}>
                    <Link
                      href={href}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
                    >
                      <Icon className="h-4 w-4" />
                      <span className="flex-1">{nama}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
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
      <div
        className={`flex min-h-screen min-w-0 flex-1 flex-col transition-[margin] duration-200 ${
          sidebarHidden ? "md:ml-0" : "md:ml-64"
        }`}
      >
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-500 md:hidden"
            aria-label="Buka menu"
          >
            <IconMenu className="h-5 w-5" />
          </button>
          <button
            onClick={toggleSidebarDesktop}
            className="hidden rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 md:inline-flex"
            aria-label={sidebarHidden ? "Tampilkan menu samping" : "Sembunyikan menu samping"}
            title={sidebarHidden ? "Tampilkan menu samping" : "Sembunyikan menu samping"}
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

        {hanyaLihat && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800 md:px-8">
            Akun Kepala Desa bersifat <strong>hanya lihat</strong>. Perubahan data
            dilakukan oleh Administrator atau perangkat desa terkait.
          </div>
        )}

        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
