import Link from "next/link";
import { IconMegaphone, IconArrowRight } from "@/components/icons";
import { labelKategoriBerita, tanggalIndo } from "@/lib/berita";

// Kartu satu berita — dipakai di beranda, /berita, dan "Berita lainnya".
export default function KartuBerita({ item }) {
  return (
    <Link
      href={`/berita/${item.id}`}
      className="bingkai-gradasi group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-navy/15"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-navy-dark">
        {item.foto_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.foto_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          />
        ) : (
          <div className="latar-mesh flex h-full w-full items-center justify-center text-gold/50">
            <IconMegaphone className="h-12 w-12 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6" />
          </div>
        )}
        {/* Gradasi bawah supaya lencana & tepi foto terasa menyatu dengan kartu */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy-dark/55 via-transparent to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-100"
        />
        <span className="absolute left-3 top-3 rounded-full border border-white/20 bg-navy-dark/70 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-md">
          {labelKategoriBerita(item.kategori)}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="inline-flex items-center gap-2 text-xs text-slate-400">
          <span aria-hidden className="h-px w-5 bg-gold" />
          {tanggalIndo(item.tanggal_terbit)}
        </p>
        <h3 className="mt-2 line-clamp-2 font-display text-lg font-semibold leading-snug text-slate-800 transition-colors duration-300 group-hover:text-navy">
          {item.judul}
        </h3>
        {item.ringkasan && (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-500">{item.ringkasan}</p>
        )}
        <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-navy">
          Baca selengkapnya
          <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
        </span>
      </div>
    </Link>
  );
}
