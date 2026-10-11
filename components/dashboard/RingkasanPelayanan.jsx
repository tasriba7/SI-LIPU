import Link from "next/link";

function Kartu({ judul, data, href }) {
  const total = data.diajukan + data.diproses + data.selesai + data.ditolak;
  const tuntas = data.selesai + data.ditolak;
  const persen = total ? Math.round((tuntas / total) * 100) : 0;
  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-bold text-navy">{judul}</h2>
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
          {persen}% tuntas
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-800">{total}</p>
      <p className="text-xs text-slate-400">total masuk</p>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px]">
        <div className="rounded-lg bg-slate-50 py-1.5">
          <p className="text-sm font-semibold text-slate-700">{data.diajukan}</p>
          <p className="text-slate-400">Baru</p>
        </div>
        <div className="rounded-lg bg-sky-50 py-1.5">
          <p className="text-sm font-semibold text-sky-700">{data.diproses}</p>
          <p className="text-slate-400">Diproses</p>
        </div>
        <div className="rounded-lg bg-emerald-50 py-1.5">
          <p className="text-sm font-semibold text-emerald-700">{data.selesai}</p>
          <p className="text-slate-400">Selesai</p>
        </div>
        <div className="rounded-lg bg-red-50 py-1.5">
          <p className="text-sm font-semibold text-red-700">{data.ditolak}</p>
          <p className="text-slate-400">Ditolak</p>
        </div>
      </div>
    </Link>
  );
}

/** Dua kartu: pelayanan administrasi & pengaduan warga. */
export default function RingkasanPelayanan({ ringkasan, hrefLayanan, hrefPengaduan }) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
        Sejauh mana desa melayani warga
      </h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Kartu judul="Pelayanan administrasi" data={ringkasan.layanan} href={hrefLayanan} />
        <Kartu judul="Pengaduan warga" data={ringkasan.pengaduan} href={hrefPengaduan} />
      </div>
    </section>
  );
}
