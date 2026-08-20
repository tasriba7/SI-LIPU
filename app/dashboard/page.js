import Link from "next/link";
import {
  IconMail,
  IconLayers,
  IconIdCard,
  IconUsers,
  IconUserPlus,
  IconMegaphone,
  IconSettings,
} from "@/components/icons";

// Daftar modul disamakan dengan MODUL_LAYANAN & MODUL_PENGATURAN di
// components/dashboard/DashboardShell.jsx supaya kartu di beranda ini dan
// menu sidebar selalu konsisten (satu sumber kebenaran untuk href tiap modul).
const MODUL_LAYANAN = [
  {
    nama: "Pengajuan Layanan",
    deskripsi: "Semua pengajuan warga (surat, pengaduan, dst) dari sistem Form Builder, satu inbox.",
    icon: IconMail,
    href: "/dashboard/layanan",
  },
  {
    nama: "Kelola Jenis Layanan",
    deskripsi: "Atur jenis layanan apa saja yang bisa diajukan warga lewat menu Ajukan Layanan.",
    icon: IconLayers,
    href: "/dashboard/jenis-layanan",
  },
  {
    nama: "Data Kependudukan",
    deskripsi: "Data induk warga: tambah, ubah, dan cari data penduduk desa.",
    icon: IconIdCard,
    href: "/dashboard/kependudukan",
  },
  {
    nama: "Slot Kadus/Ketua RT",
    deskripsi: "Kelola slot jabatan per wilayah (Kadus, Ketua RT) dan siapa yang mengisinya.",
    icon: IconUsers,
    href: "/dashboard/posisi",
  },
  {
    nama: "Pendaftaran Akun",
    deskripsi: "Tinjau dan proses pendaftaran akun untuk slot jabatan yang dibuka umum.",
    icon: IconUserPlus,
    href: "/dashboard/pendaftaran",
  },
  {
    nama: "Pengajuan Surat (lama)",
    deskripsi: "Modul pengajuan surat versi awal, tetap aktif untuk kompatibilitas.",
    icon: IconMail,
    href: "/dashboard/surat",
  },
  {
    nama: "Pengumuman Desa",
    deskripsi: "Segera hadir.",
    icon: IconMegaphone,
    href: null,
  },
];

const MODUL_PENGATURAN = [
  {
    nama: "Pengaturan Desa",
    deskripsi: "Identitas desa/kelurahan dan foto latar beranda publik.",
    icon: IconSettings,
    href: "/dashboard/pengaturan-desa",
  },
];

function KartuModul({ nama, deskripsi, icon: Icon, href }) {
  const isi = (
    <>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-dark/5 text-navy-dark">
        <Icon className="h-5 w-5" />
      </span>
      <div className="mt-3">
        <p className="text-sm font-semibold text-slate-800">{nama}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">{deskripsi}</p>
      </div>
      {!href && (
        <span className="mt-3 inline-block w-fit rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
          segera
        </span>
      )}
    </>
  );

  const className =
    "flex flex-col rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm";

  if (!href) {
    return <div className={`${className} cursor-not-allowed opacity-70`}>{isi}</div>;
  }

  return (
    <Link href={href} className={className}>
      {isi}
    </Link>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-bold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-500">
          Pilih modul di bawah untuk mulai bekerja.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Modul layanan
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODUL_LAYANAN.map((modul) => (
            <KartuModul key={modul.nama} {...modul} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Pengaturan
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODUL_PENGATURAN.map((modul) => (
            <KartuModul key={modul.nama} {...modul} />
          ))}
        </div>
      </section>
    </div>
  );
}
