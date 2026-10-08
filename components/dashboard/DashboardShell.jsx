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
  IconUsers,
  IconLogout,
  IconLayers,
  IconIdCard,
  IconUserPlus,
  IconSettings,
  IconImage,
  IconKey,
} from "@/components/icons";
import { ROLE_BADGE_CLASS, isAdminRole, bisaMenulis, labelJabatan } from "@/lib/roles";

const MODUL_LAYANAN = [
  { nama: "Pengajuan Layanan", icon: IconMail, href: "/dashboard/layanan" },
  { nama: "Kelola Jenis Layanan", icon: IconLayers, href: "/dashboard/jenis-layanan" },
  { nama: "Data Kependudukan", icon: IconIdCard, href: "/dashboard/kependudukan" },
  { nama: "Galeri Kegiatan", icon: IconImage, href: "/dashboard/galeri" },
  { nama: "Slot Kadus/Ketua RT", icon: IconUsers, href: "/dashboard/posisi" },
  { nama: "Pendaftaran Akun", icon: IconUserPlus, href: "/dashboard/pendaftaran" },
  { nama: "Pengajuan Surat (lama)", icon: IconMail, href: "/dashboard/surat" },
  { nama: "Pengumuman Desa", icon: IconMegaphone },
];

// Menu yang hanya muncul untuk Administrator.
const HREF_KHUSUS_ADMIN = [
  "/dashboard/posisi",
  "/dashboard/pendaftaran",
  "/dashboard/kelola-akun",
  "/dashboard/pengaturan-desa",
];

const MODUL_PENGATURAN = [
  { nama: "Kelola Akun Staf", icon: IconKey, href: "/dashboard/kelola-akun" },
  { nama: "Pengaturan Desa", icon: IconSettings, href: "/dashboard/pengaturan-desa" },
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
  children,
}) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sapaan, setSapaan] = useState("Selamat datang");

  useEffect(() => {
    setSapaan(sapaanWaktu(new Date().getHours()));
  }, []);

  // Cek ulang badge notifikasi tiap 30 detik supaya pendaftaran baru
  // muncul tanpa admin harus pindah halaman / refresh manual.
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 30000);
    return () => clearInterval(t);
  }, [router]);

  const badgeClass =
    ROLE_BADGE_CLASS[profile?.role] ?? "bg-white/10 text-white/70";

  const adalahAdmin = isAdminRole(profile?.role);
  const modulPengaturan = MODUL_PENGATURAN.filter(
    (m) => !HREF_KHUSUS_ADMIN.includes(m.href) || adalahAdmin
  );
  const modulLayanan = MODUL_LAYANAN.filter(
    (m) => !HREF_KHUSUS_ADMIN.includes(m.href) || adalahAdmin
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
