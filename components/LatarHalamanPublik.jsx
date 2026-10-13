"use client";

import { usePathname } from "next/navigation";
import LatarGulirBeranda from "@/components/LatarGulirBeranda";

// Memasang latar foto yang sama dengan beranda di SEMUA halaman publik lain
// (profil, berita, wisata, galeri, APBDes, cuaca, struktur organisasi,
// pendaftaran, Panel Warga, dst.).
//
// Beranda dikecualikan: ia sudah memasang LatarGulirBeranda sendiri di bawah
// hero dengan 4 latar yang berganti saat scroll (lihat app/(publik)/page.js).
// Halaman lain memakai 1 lapisan saja — foto, kerudung terang, dan pendar
// warna yang sama — yang menempel di layar saat halaman di-scroll.
export default function LatarHalamanPublik({ foto = [], children }) {
  const pathname = usePathname();
  if (pathname === "/") return children;

  return (
    <LatarGulirBeranda foto={foto} jumlah={1}>
      {children}
    </LatarGulirBeranda>
  );
}
