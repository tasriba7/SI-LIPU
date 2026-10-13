import Link from "next/link";
import { IconArrowRight, IconMegaphone } from "@/components/icons";
import SectionHeading from "@/components/SectionHeading";

// Ringkasan "apakah aduan warga ditindaklanjuti": persen selesai, rata-rata
// lama penyelesaian, dan sebaran status. Angka agregat dari migrasi 0050.
// Bilah status TIDAK mengandalkan warna saja: setiap bagian punya label
// angka di legenda di bawahnya.
function RingkasanPenanganan({ p }) {
  const bagian = [
    { kunci: "selesai", label: "Selesai", jumlah: p.selesai, warna: "bg-emerald-600", titik: "bg-emerald-600" },
    { kunci: "diproses", label: "Sedang diproses", jumlah: p.diproses, warna: "bg-gold", titik: "bg-gold" },
    { kunci: "menunggu", label: "Menunggu", jumlah: p.menunggu, warna: "bg-slate-300", titik: "bg-slate-300" },
  ];

  return (
    <div className="mt-10 rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <p className="font-display text-4xl font-bold text-navy-dark">{p.persenSelesai}%</p>
          <p className="mt-1 text-sm text-slate-500">
            aduan sudah selesai ditangani ({p.selesai} dari {p.total} aduan)
          </p>
        </div>
        {p.lamaRataRata && (
          <div>
            <p className="font-display text-4xl font-bold text-navy-dark">{p.lamaRataRata}</p>
            <p className="mt-1 text-sm text-slate-500">rata-rata waktu sampai aduan selesai</p>
          </div>
        )}
      </div>

      <div
        className="mt-6 flex h-3 overflow-hidden rounded-full bg-slate-100"
        role="img"
        aria-label={`Status aduan: ${p.selesai} selesai, ${p.diproses} sedang diproses, ${p.menunggu} menunggu`}
      >
        {bagian.map(
          (b) =>
            b.jumlah > 0 && (
              <div
                key={b.kunci}
                className={`h-full ${b.warna}`}
                style={{ width: `${(b.jumlah / p.total) * 100}%` }}
              />
            ),
        )}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
        {bagian.map((b) => (
          <li key={b.kunci} className="flex items-center gap-1.5">
            <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${b.titik}`} />
            {b.label}: <strong className="font-semibold text-slate-800">{b.jumlah}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

// "Aduan yang Sering Disampaikan" di beranda: peringkat jenis pengaduan
// terbanyak dari warga + ringkasan penanganannya. Hanya angka agregat (lihat
// migrasi 0049 dan 0050) -- tidak ada identitas atau isi pengaduan. Belum ada
// pengaduan -> section tidak tampil.
export default function AduanPopulerBeranda({ data }) {
  if (!data || !data.items || data.items.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <SectionHeading
        kecil="Suara Warga"
        judul="Aduan Warga & Penanganannya"
        deskripsi="Jenis pengaduan yang paling banyak disampaikan warga dan sejauh mana ditindaklanjuti. Identitas pelapor tidak pernah ditampilkan."
        aksi={
          <Link
            href="/layanan"
            className="group inline-flex shrink-0 items-center gap-1.5 rounded-full border border-navy/15 bg-white/70 px-4 py-2 text-sm font-medium text-navy backdrop-blur transition hover:border-gold hover:bg-white hover:shadow-md"
          >
            Sampaikan pengaduan
            <IconArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        }
      />

      {data.penanganan && <RingkasanPenanganan p={data.penanganan} />}

      <h3 className="mt-12 font-display text-lg font-semibold text-navy-dark">
        Jenis aduan terbanyak
      </h3>
      <ol className="mt-4 grid gap-4 lg:grid-cols-2">
        {data.items.map((item, i) => (
          <li
            key={item.jenis}
            className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur"
          >
            <div className="flex items-start gap-4">
              <span
                aria-hidden
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy font-display text-base font-bold text-white"
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-snug text-navy-dark">{item.jenis}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {item.jumlah} aduan
                  {data.total > 0 && ` · ${item.persen}% dari seluruh pengaduan`}
                </p>
                <div
                  className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"
                  role="presentation"
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-gold to-navy"
                    style={{ width: `${item.lebar}%` }}
                  />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-6 flex items-center gap-2 text-xs text-slate-500">
        <IconMegaphone className="h-4 w-4 shrink-0" />
        Berdasarkan {data.total} pengaduan yang masuk melalui SI-LIPU.
      </p>
    </section>
  );
}
