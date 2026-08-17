import {
  IconMail,
  IconMessage,
  IconMegaphone,
  IconUsers,
  IconSparkle,
} from "@/components/icons";

const STATISTIK = [
  { label: "Pengajuan surat", icon: IconMail },
  { label: "Pengaduan warga", icon: IconMessage },
  { label: "Pengumuman aktif", icon: IconMegaphone },
  { label: "Warga terdata", icon: IconUsers },
];

const MODUL = [
  {
    nama: "Pengajuan Surat",
    deskripsi:
      "Warga ajukan surat (domisili, SKTM, dll.) tanpa login, dapat kode tracking.",
    icon: IconMail,
  },
  {
    nama: "Pengaduan Warga",
    deskripsi: "Warga sampaikan aspirasi/keluhan, ditindaklanjuti perangkat desa.",
    icon: IconMessage,
  },
  {
    nama: "Pengumuman Desa",
    deskripsi: "Publikasikan info & pengumuman resmi ke warga.",
    icon: IconMegaphone,
  },
  {
    nama: "Data Kependudukan",
    deskripsi: "Rekap data & statistik penduduk per dusun.",
    icon: IconUsers,
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Banner sambutan */}
      <div className="flex items-start gap-3 rounded-2xl bg-navy px-5 py-4 text-white">
        <IconSparkle className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
        <p className="text-sm text-white/90">
          Dashboard ini akan terus dikembangkan bertahap. Statistik di bawah
          masih placeholder — akan otomatis terisi begitu masing-masing
          modul layanan aktif.
        </p>
      </div>

      {/* Kartu statistik */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-500">
          Ringkasan
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {STATISTIK.map(({ label, icon: Icon }) => (
            <div
              key={label}
              className="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <Icon className="h-5 w-5 text-navy-light" />
              <p className="mt-3 text-2xl font-bold text-slate-800">–</p>
              <p className="text-xs text-slate-400">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Grid modul layanan */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-500">
          Modul layanan
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {MODUL.map(({ nama, deskripsi, icon: Icon }) => (
            <div
              key={nama}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-navy-light/40 hover:shadow-sm"
            >
              <span className="absolute right-4 top-4 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                Segera hadir
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy/10 text-navy">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-slate-800">{nama}</h3>
              <p className="mt-1 text-sm text-slate-500">{deskripsi}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
