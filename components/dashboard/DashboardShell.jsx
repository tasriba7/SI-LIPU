"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { IconMenu, IconClose, IconHome, IconLogout } from "@/components/icons";
import { ROLE_BADGE_CLASS, bisaMenulis, isPanitiaPilkades, labelJabatan } from "@/lib/roles";
import { grupUntukRole, cariHrefAktif } from "@/lib/menuDashboard";

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
  const pathname = usePathname();
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

  // Menu berkelompok (lihat lib/menuDashboard.js). Grup yang berisi halaman
  // aktif otomatis terbuka; grup lain terlipat supaya sidebar tidak panjang.
  // Pilihan buka/lipat manual diingat di browser.
  const grup = grupUntukRole(profile?.role);
  const hrefAktif = cariHrefAktif(
    pathname || "",
    grup.flatMap((g) => g.item.map((i) => i.href))
  );
  const [pilihanGrup, setPilihanGrup] = useState({});

  useEffect(() => {
    try {
      const s = localStorage.getItem("si-lipu-sidebar-grup");
      if (s) setPilihanGrup(JSON.parse(s));
    } catch {}
  }, []);

  // Di HP: tutup sidebar otomatis setelah pindah halaman.
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  function grupTerbuka(g) {
    if (g.item.some((i) => i.href && i.href === hrefAktif)) return true;
    return pilihanGrup[g.kunci] ?? false;
  }

  function toggleGrup(g) {
    const sekarang = grupTerbuka(g);
    setPilihanGrup((prev) => {
      const next = { ...prev, [g.kunci]: !sekarang };
      try {
        localStorage.setItem("si-lipu-sidebar-grup", JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  // Badge notifikasi per menu (angka di sebelah nama menu).
  function badgeUntuk(href) {
    if (href === "/dashboard/kelola-akun" && jumlahPendaftaran > 0)
      return { n: jumlahPendaftaran, kelas: "bg-red-500", label: `${jumlahPendaftaran} pendaftaran menunggu` };
    if (href === "/dashboard/layanan" && jumlahPengajuanBaru > 0)
      return {
        n: jumlahPengajuanBaru,
        kelas: "bg-zinc-500",
        label: `${jumlahPengajuanBaru} pengajuan layanan baru`,
        title: "Ada pengajuan layanan baru dari warga",
      };
    if (href === "/dashboard/kependudukan" && jumlahDataKurang > 0)
      return {
        n: jumlahDataKurang,
        kelas: "bg-amber-500",
        label: `${jumlahDataKurang} data warga belum lengkap`,
        title: "Ada data warga yang belum lengkap",
      };
    return null;
  }

  // Modul Pilkades memakai tampilan terang (biru) agar mudah dibaca semua kalangan.
  const modePilkades = (pathname || "").startsWith("/dashboard/pilkades");
  const tanpaProfil = !profile?.role;
  // Panitia Pilkades bukan "hanya lihat": hak tulisnya ada di modul Pilkades.
  const hanyaLihat =
    !tanpaProfil && !bisaMenulis(profile?.role) && !isPanitiaPilkades(profile?.role);

  return (
    <div className={`min-h-screen md:flex ${modePilkades ? "bg-sky-50" : "bg-slate-50"}`}>
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
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col ${modePilkades ? "bg-sky-900" : "bg-navy-dark"} transition-transform duration-200 ${
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
            <p className={`mt-1 text-[11px] leading-none ${modePilkades ? "text-sky-200" : "text-white/50"}`}>
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
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              pathname === "/dashboard" ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <IconHome className="h-4 w-4" />
            Dashboard
          </Link>

          {grup.map((g) => {
            const terbuka = grupTerbuka(g);
            const adaBadge = g.item.some((i) => i.href && badgeUntuk(i.href));
            return (
              <div key={g.kunci} className="mt-4">
                <button
                  type="button"
                  onClick={() => toggleGrup(g)}
                  aria-expanded={terbuka}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider ${modePilkades ? "text-sky-200 hover:text-white" : "text-white/40 hover:text-white/70"} transition`}
                >
                  <span className="flex-1">{g.judul}</span>
                  {!terbuka && adaBadge && (
                    <span aria-label="Ada notifikasi di grup ini" className="h-2 w-2 rounded-full bg-red-500" />
                  )}
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    aria-hidden
                    className={`h-3 w-3 transition-transform duration-200 ${terbuka ? "rotate-180" : ""}`}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {terbuka && (
                  <ul className="mt-1 space-y-0.5">
                    {g.item.map(({ nama, icon: Icon, href }) => {
                      if (!href) {
                        return (
                          <li key={nama}>
                            <div className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/40">
                              <Icon className="h-4 w-4" />
                              <span className="flex-1">{nama}</span>
                              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px]">segera</span>
                            </div>
                          </li>
                        );
                      }
                      const aktif = href === hrefAktif;
                      const badge = badgeUntuk(href);
                      return (
                        <li key={nama}>
                          <Link
                            href={href}
                            aria-current={aktif ? "page" : undefined}
                            className={`flex items-center gap-3 rounded-lg px-3 ${modePilkades ? "py-2.5 text-base" : "py-2 text-sm"} transition ${
                              aktif
                                ? modePilkades
                                  ? "bg-sky-500 font-semibold text-white shadow"
                                  : "bg-white/10 font-medium text-white"
                                : modePilkades
                                  ? "text-sky-50 hover:bg-white/15 hover:text-white"
                                  : "text-white/70 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            <Icon className={modePilkades ? "h-5 w-5" : "h-4 w-4"} />
                            <span className="flex-1">{nama}</span>
                            {badge && (
                              <span
                                aria-label={badge.label}
                                title={badge.title}
                                className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-white ${badge.kelas}`}
                              >
                                {badge.n > 99 ? "99+" : badge.n}
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="mb-2 rounded-lg bg-white/5 px-3 py-2.5">
            <p className="truncate text-sm font-medium text-white">
              {profile?.nama}
            </p>
            <span
              className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${modePilkades ? "bg-sky-100 text-sky-900" : badgeClass}`}
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
            <p className="text-xs text-slate-500">
              Panel {labelJabatan(profile)} — Desa
            </p>
          </div>
        </header>

        {tanpaProfil && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-800 md:px-8">
            Akun ini belum memiliki profil staf, jadi belum punya hak akses apa pun.
            Hubungi Administrator desa.
          </div>
        )}

        {hanyaLihat && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800 md:px-8">
            Akun {profile?.role === "bpd" ? "Anggota BPD" : "Kepala Desa"} bersifat{" "}
            <strong>hanya lihat</strong>. Perubahan data dilakukan oleh Administrator atau
            perangkat desa terkait.
          </div>
        )}

        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
