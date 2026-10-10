import Link from "next/link";
import { IconMapPin, IconArrowRight } from "@/components/icons";
import { labelKategori } from "@/lib/wisata";

// Kartu satu destinasi wisata — dipakai di beranda dan halaman /wisata.
export default function KartuWisata({ item }) {
  return (
    <Link
      href={`/wisata/${item.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-gold hover:shadow-xl hover:shadow-navy/10"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        {item.foto_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.foto_url}
            alt={item.nama}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
        <span className="absolute left-3 top-3 rounded-full bg-navy-dark/80 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
          {labelKategori(item.kategori)}
        </span>
        {item.unggulan && (
          <span className="absolute right-3 top-3 rounded-full bg-gold px-2.5 py-1 text-[11px] font-semibold text-navy-dark">
            Unggulan
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-semibold text-slate-800">{item.nama}</h3>
        {item.lokasi && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
            <IconMapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{item.lokasi}</span>
          </p>
        )}
        {item.deskripsi && (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-500">{item.deskripsi}</p>
        )}
        <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-navy">
          Lihat detail
          <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}
