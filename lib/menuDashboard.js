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
// `bagian` (opsional) = judul pemisah kecil yang tampil DI ATAS item itu di sidebar.
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
  IconCalendarRange,
  IconClock,
  IconUserPlus,
  IconBriefcase,
  IconCheck,
} from "@/components/icons";
import { bisaLihatMenu } from "@/lib/roles";

export const GRUP_MENU = [
  {
    kunci: "pilkades",
    judul: "Pilkades",
    item: [
      {
        nama: "Mulai di Sini (Panduan)",
        deskripsi: "Lihat langkah yang harus dikerjakan panitia, dari awal sampai cetak daftar.",
        icon: IconClipboardCheck,
        href: "/dashboard/pilkades",
        akses: "pilkades",
      },
      {
        nama: "Jadwal Tahapan",
        deskripsi: "Isi tanggal tiap tahapan Pilkades; tampil sebagai garis waktu di beranda dan bisa dicetak.",
        icon: IconCalendarRange,
        href: "/dashboard/pilkades/jadwal",
        akses: "pilkades",
      },
      {
        nama: "Pengaturan Panitia",
        bagian: "Persiapan",
        deskripsi: "Susunan panitia (nama untuk tanda tangan), logo kop dokumen, dan periode pemilihan.",
        icon: IconBriefcase,
        href: "/dashboard/pilkades/pengaturan",
        akses: "pilkades",
      },
      {
        nama: "1. Ambil Data Warga",
        bagian: "Daftar pemilih",
        deskripsi: "Salin data warga desa menjadi daftar calon pemilih.",
        icon: IconUserPlus,
        href: "/dashboard/pilkades/ambil",
        akses: "pilkades",
      },
      {
        nama: "2. Periksa Pemilih",
        deskripsi: "Tandai siapa yang berhak memilih; saring otomatis berdasarkan usia.",
        icon: IconUsers,
        href: "/dashboard/pilkades/pemilih",
        akses: "pilkades",
      },
      {
        nama: "3. Atur TPS",
        deskripsi: "Tambahkan tempat pemungutan suara (TPS).",
        icon: IconMapPin,
        href: "/dashboard/pilkades/tps",
        akses: "pilkades",
      },
      {
        nama: "4. Tempatkan Pemilih ke TPS",
        deskripsi: "Tentukan pemilih mencoblos di TPS mana, bisa banyak sekaligus.",
        icon: IconSitemap,
        href: "/dashboard/pilkades/tempatkan",
        akses: "pilkades",
      },
      {
        nama: "5. Tetapkan DPS & DPT",
        deskripsi: "Jadikan daftar pemilih resmi: DPS dulu, lalu DPT. Tidak bisa diubah setelah ditetapkan.",
        icon: IconIdCard,
        href: "/dashboard/pilkades/daftar",
        akses: "pilkades",
      },
      {
        nama: "6. Cetak Daftar",
        deskripsi: "Cetak daftar pemilih untuk ditempel di papan pengumuman.",
        icon: IconFileSpreadsheet,
        href: "/dashboard/pilkades/cetak",
        akses: "pilkades",
      },
      {
        nama: "Pemilih Tambahan",
        deskripsi: "Catat warga yang berhak memilih tetapi terlewat dari DPT (setelah DPT ditetapkan).",
        icon: IconUserPlus,
        href: "/dashboard/pilkades/tambahan",
        akses: "pilkades",
      },
      {
        nama: "Calon Kepala Desa",
        bagian: "Calon & hari pemungutan",
        deskripsi: "Catat calon yang mendaftar, hasil verifikasi, dan nomor urut.",
        icon: IconUsers,
        href: "/dashboard/pilkades/calon",
        akses: "pilkades",
      },
      {
        nama: "Surat Undangan Memilih",
        deskripsi: "Cetak surat undangan ke TPS untuk tiap pemilih di DPT (2 surat per kertas).",
        icon: IconMail,
        href: "/dashboard/pilkades/undangan",
        akses: "pilkades",
      },
      {
        nama: "Hari Pemungutan",
        deskripsi: "Cetak daftar hadir pemilih, lalu rekap angka tiap TPS (hadir dan hasil suara), penetapan calon terpilih, dan berita acara.",
        icon: IconCheck,
        href: "/dashboard/pilkades/hari-h",
        akses: "pilkades",
      },
      {
        nama: "Aduan Warga",
        bagian: "Aduan warga",
        deskripsi: "Aduan warga seputar Pilkades (data pemilih, kampanye, TPS, dll.). Hanya lihat.",
        icon: IconMessage,
        href: "/dashboard/pilkades/aduan",
        akses: "pilkades",
      },
      {
        nama: "Riwayat Aktivitas",
        bagian: "Arsip",
        deskripsi: "Catatan siapa melakukan apa dan kapan di modul Pilkades.",
        icon: IconClock,
        href: "/dashboard/pilkades/riwayat",
        akses: "pilkades",
      },
    ],
  },
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
