import Link from "next/link";
import { IconMapPin, IconArrowRight, IconSparkle } from "@/components/icons";
import { labelKategori } from "@/lib/wisata";

// Kartu satu destinasi wisata — dipakai di beranda dan halaman /wisata.
export default function KartuWisata({ item }) {
  return (
    <Link
      href={`/wisata/${item.id}`}
      className="bingkai-gradasi group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-navy/15"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        {item.foto_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.foto_url}
            alt={item.nama}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          />
        )}
        {/* Gradasi bawah + lencana lokasi muncul halus saat kartu disorot */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy-dark/70 via-navy-dark/5 to-transparent opacity-60 transition-opacity duration-500 group-hover:opacity-100"
        />
        <span className="absolute left-3 top-3 rounded-full border border-white/20 bg-navy-dark/70 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-md">
          {labelKategori(item.kategori)}
        </span>
        {item.unggulan && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-gold to-gold-light px-2.5 py-1 text-[11px] font-semibold text-navy-dark shadow-md shadow-gold/30">
            <IconSparkle className="h-3 w-3" />
            Unggulan
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-semibold text-slate-800 transition-colors duration-300 group-hover:text-navy">
          {item.nama}
        </h3>
        {item.lokasi && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
            <IconMapPin className="h-3.5 w-3.5 shrink-0 text-gold" />
            <span className="truncate">{item.lokasi}</span>
          </p>
        )}
        {item.deskripsi && (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-500">{item.deskripsi}</p>
        )}
        <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-navy">
          Lihat detail
          <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
        </span>
      </div>
    </Link>
  );
}
