// SATU sumber daftar menu dashboard admin, dipakai oleh sidebar
// (components/dashboard/DashboardShell.jsx) dan kartu modul di
// app/dashboard/page.js — jadi keduanya selalu sama.
//
// Menu dikelompokkan supaya sidebar tetap rapi walau modul bertambah.
// Modul baru? Tambahkan satu baris `item` ke grup yang paling cocok
// (atau buat grup baru). `akses`:
//   "semua"  -> semua staf (data dibatasi RLS per wilayah)
//   "kantor" -> perangkat kantor desa (lihat ROLE_KANTOR_DESA); saat ini tidak dipakai
//   "admin"  -> hanya Administrator
//   "bpd"    -> hanya Anggota BPD (menu pemantauan, hanya lihat)
// `href` kosong = belum ada halamannya ("segera"). Samakan `akses` dengan
// penjaga di layout.js folder halaman terkait dan di lib/akses.js.

import {
  IconMail,
  IconMegaphone,
  IconMessage,
  IconUsers,
  IconLayers,
  IconIdCard,
  IconSettings,
  IconImage,
  IconKey,
  IconHeartHandshake,
  IconMapPin,
  IconClipboardCheck,
  IconFileSpreadsheet,
  IconSitemap,
} from "@/components/icons";
import { bisaLihatMenu } from "@/lib/roles";

export const GRUP_MENU = [
  {
    kunci: "layanan",
    judul: "Layanan Warga",
    item: [
      {
        nama: "Pengajuan Layanan",
        deskripsi: "Semua pengajuan warga (surat, pengaduan, dst) dalam satu inbox.",
        icon: IconMail,
        href: "/dashboard/layanan",
        akses: "semua",
      },
      {
        nama: "Pengaduan Warga",
        deskripsi: "Pantau aduan warga dan bagaimana desa menanganinya (hanya lihat).",
        icon: IconMessage,
        href: "/dashboard/pengaduan",
        akses: "bpd",
      },
      {
        nama: "Surat Terbit",
        deskripsi: "Arsip surat resmi yang sudah diterbitkan beserta nomornya.",
        icon: IconClipboardCheck,
        href: "/dashboard/surat-terbit",
        akses: "admin",
      },
      {
        nama: "Kelola Jenis Layanan",
        deskripsi: "Atur jenis layanan apa saja yang bisa diajukan warga.",
        icon: IconLayers,
        href: "/dashboard/jenis-layanan",
        akses: "admin",
      },
      {
        nama: "Kelola Template Surat",
        deskripsi: "Ubah isi dan format template surat otomatis.",
        icon: IconLayers,
        href: "/dashboard/template-surat",
        akses: "admin",
      },
      {
        nama: "Pengajuan Surat (lama)",
        deskripsi: "Modul pengajuan surat versi awal, tetap aktif untuk kompatibilitas.",
        icon: IconMail,
        href: "/dashboard/surat",
        akses: "admin",
      },
    ],
  },
  {
    kunci: "penduduk",
    judul: "Data Penduduk",
    item: [
      {
        nama: "Data Kependudukan",
        deskripsi: "Data induk warga: tambah, ubah, dan cari data penduduk desa.",
        icon: IconIdCard,
        href: "/dashboard/kependudukan",
        akses: "semua",
      },
      {
        nama: "Laporan Data Warga",
        deskripsi: "Laporan koreksi data dari warga untuk ditindaklanjuti.",
        icon: IconMessage,
        href: "/dashboard/laporan-data",
        akses: "admin",
      },
      {
        nama: "Bantuan Desa",
        deskripsi: "Daftar penerima PKH, BLT, sembako, dan bantuan lain.",
        icon: IconHeartHandshake,
        href: "/dashboard/bantuan",
        akses: "admin",
      },
    ],
  },
  {
    kunci: "konten",
    judul: "Konten & Transparansi",
    item: [
      {
        nama: "Berita Desa",
        deskripsi: "Tulis dan terbitkan berita; draf bisa disimpan dulu.",
        icon: IconMegaphone,
        href: "/dashboard/berita",
        akses: "admin",
      },
      {
        nama: "APBDes",
        deskripsi: "Anggaran pendapatan & belanja desa per tahun untuk transparansi warga.",
        icon: IconFileSpreadsheet,
        href: "/dashboard/apbdes",
        akses: "admin",
      },
      {
        nama: "Wisata Desa",
        deskripsi: "Tambah dan atur destinasi wisata yang tampil di beranda.",
        icon: IconMapPin,
        href: "/dashboard/wisata",
        akses: "admin",
      },
      {
        nama: "Struktur Organisasi",
        deskripsi: "Atur bagan perangkat desa: foto, nama, dan jabatan dari Kepala Desa ke bawah.",
        icon: IconSitemap,
        href: "/dashboard/struktur-organisasi",
        akses: "admin",
      },
      {
        nama: "Galeri Kegiatan",
        deskripsi: "Unggah foto kegiatan desa untuk beranda dan halaman Galeri.",
        icon: IconImage,
        href: "/dashboard/galeri",
        akses: "admin",
      },
      {
        nama: "Banner Halaman",
        deskripsi: "Gambar di bawah header untuk tiap menu publik.",
        icon: IconImage,
        href: "/dashboard/pengaturan-desa/banner-halaman",
        akses: "admin",
      },
      {
        nama: "Pengumuman Desa",
        deskripsi: "Segera hadir.",
        icon: IconMegaphone,
        href: null,
        akses: "admin",
      },
    ],
  },
  {
    kunci: "akun",
    judul: "Perangkat & Akun",
    item: [
      {
        nama: "Slot Kadus/Ketua RT",
        deskripsi: "Kelola slot jabatan per wilayah dan siapa yang mengisinya.",
        icon: IconUsers,
        href: "/dashboard/posisi",
        akses: "admin",
      },
      {
        nama: "Akun Staf",
        deskripsi: "Akun aktif, pendaftaran yang masuk, dan pembuatan akun baru perangkat desa.",
        icon: IconKey,
        href: "/dashboard/kelola-akun",
        akses: "admin",
      },
    ],
  },
  {
    kunci: "pengaturan",
    judul: "Pengaturan",
    item: [
      {
        nama: "Pengaturan Desa",
        deskripsi: "Identitas desa, foto beranda, profil, tanda tangan, dan stempel.",
        icon: IconSettings,
        href: "/dashboard/pengaturan-desa",
        akses: "admin",
      },
    ],
  },
];

/** Grup menu yang boleh dilihat `role`; grup tanpa isi dibuang. */
export function grupUntukRole(role) {
  return GRUP_MENU.map((g) => ({
    ...g,
    item: g.item.filter((i) => bisaLihatMenu(role, i.akses)),
  })).filter((g) => g.item.length > 0);
}

/**
 * Dari daftar href, cari yang paling cocok dengan `pathname` (yang terpanjang
 * menang, supaya "/dashboard/pengaturan-desa/banner-halaman" tidak ikut
 * menyalakan "/dashboard/pengaturan-desa").
 */
export function cariHrefAktif(pathname, daftarHref) {
  let terbaik = null;
  for (const h of daftarHref) {
    if (!h) continue;
    if (pathname === h || pathname.startsWith(h + "/")) {
      if (!terbaik || h.length > terbaik.length) terbaik = h;
    }
  }
  return terbaik;
}
