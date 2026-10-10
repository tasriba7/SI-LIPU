import Link from "next/link";
import { IconMegaphone, IconArrowRight } from "@/components/icons";
import { labelKategoriBerita, tanggalIndo } from "@/lib/berita";

// Kartu satu berita — dipakai di beranda, /berita, dan "Berita lainnya".
export default function KartuBerita({ item }) {
  return (
    <Link
      href={`/berita/${item.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-gold hover:shadow-xl hover:shadow-navy/10"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-navy-dark">
        {item.foto_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.foto_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gold/40">
            <IconMegaphone className="h-12 w-12" />
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-navy-dark/80 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
          {labelKategoriBerita(item.kategori)}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs text-slate-400">{tanggalIndo(item.tanggal_terbit)}</p>
        <h3 className="mt-1.5 line-clamp-2 font-display text-lg font-semibold leading-snug text-slate-800">
          {item.judul}
        </h3>
        {item.ringkasan && (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-500">{item.ringkasan}</p>
        )}
        <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-navy">
          Baca selengkapnya
          <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}
