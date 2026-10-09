import { ROLE_LABELS } from "@/lib/roles";
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
import { createClient } from "@/lib/supabase/server";
import { ringkasKolomKosong } from "@/lib/kelengkapan";
import {
  getStatistikBeranda,
  getStatistikBerandaDetail,
  getStatistikPerDusun,
} from "@/lib/statistikBeranda";
import StatistikDashboard from "@/components/dashboard/StatistikDashboard";

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

// Label peran penginput. Kadus/Ketua RT dipersingkat; peran lain pakai label
// resmi dari lib/roles (mis. "Administrator", "Kepala Desa"), bukan teks mentah.
function labelRolePenginput(role) {
  if (role === "kadus") return "Kadus";
  if (role === "ketua_rt") return "Ketua RT";
  return ROLE_LABELS[role] ?? role ?? "";
}

export default async function DashboardPage() {
  const supabase = await createClient();

  // Ringkasan data warga belum lengkap PER PENGINPUT. Mengikuti RLS: staf
  // desa (admin) melihat semua penginput dari semua wilayah — termasuk yang
  // ditambahkan Kadus/Ketua RT — sedangkan Kadus/Ketua RT hanya melihat
  // ringkasan wilayahnya sendiri.
  // Statistik kependudukan (angka agregat; sama dengan beranda publik).
  const [statRingkas, statDetail, statDusun] = await Promise.all([
    getStatistikBeranda(),
    getStatistikBerandaDetail(),
    getStatistikPerDusun(),
  ]);

  const { data: ringkasanKelengkapan } = await supabase
    .from("ringkasan_kelengkapan_penginput")
    .select("dibuat_oleh, nama, role, wilayah, total, belum_lengkap")
    .gt("belum_lengkap", 0)
    .order("belum_lengkap", { ascending: false })
    .limit(8);

  const { data: kolomTersering } = await supabase
    .from("ringkasan_kolom_kosong")
    .select("kolom, jumlah")
    .order("jumlah", { ascending: false })
    .limit(5);

  const { count: menunggu } = await supabase
    .from("pengajuan_layanan")
    .select("id", { count: "exact", head: true })
    .eq("status", "diajukan");

  const totalBelumLengkap = (ringkasanKelengkapan ?? []).reduce(
    (a, r) => a + (r.belum_lengkap || 0),
    0
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-bold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-500">
          Pilih modul di bawah untuk mulai bekerja.
        </p>
      </div>

      {menunggu > 0 && (
        <Link
          href="/dashboard/layanan?status=diajukan"
          className="flex items-center justify-between gap-4 rounded-2xl border border-gold/50 bg-gold/10 p-5 transition hover:shadow-md"
        >
          <div>
            <h2 className="text-sm font-bold text-navy">
              {menunggu} pengajuan layanan menunggu diproses
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Klik untuk membuka daftar pengajuan baru.
            </p>
          </div>
          <span className="shrink-0 rounded-lg bg-navy px-3 py-1.5 text-xs font-medium text-white">
            Proses sekarang
          </span>
        </Link>
      )}

      {ringkasanKelengkapan && ringkasanKelengkapan.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-amber-800">
                ⚠ Ada {totalBelumLengkap} data kependudukan yang belum lengkap
              </h2>
              <p className="mt-1 text-xs text-amber-700">
                Rincian per penginput di bawah ini. Klik "Data Kependudukan" untuk
                membuka dan melengkapi.
              </p>
            </div>
            <Link
              href="/dashboard/kependudukan?kurang=1"
              className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
            >
              Lihat & lengkapi
            </Link>
          </div>

          <div className="mt-3 divide-y divide-amber-100 overflow-hidden rounded-xl border border-amber-100 bg-white">
            {ringkasanKelengkapan.map((r) => (
              <div
                key={r.dibuat_oleh ?? "tanpa-penginput"}
                className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
              >
                <div>
                  <p className="font-medium text-slate-700">
                    {r.nama || "Data lama / impor (penginput tidak tercatat)"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {[
                      labelRolePenginput(r.role),
                      r.wilayah,
                    ]
                      .filter(Boolean)
                      .join(" — ")}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                  {r.belum_lengkap} dari {r.total} data
                </span>
              </div>
            ))}
          </div>

          {kolomTersering && kolomTersering.length > 0 && (
            <p className="mt-3 text-xs text-amber-700">
              Kolom paling sering kosong: {ringkasKolomKosong(kolomTersering.map((k) => k.kolom), 5)}.
            </p>
          )}
        </div>
      )}

      <StatistikDashboard
        ringkas={statRingkas}
        detail={statDetail}
        perDusun={statDusun}
      />

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
