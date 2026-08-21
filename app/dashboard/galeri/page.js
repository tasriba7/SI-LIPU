import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getGaleri } from "@/lib/galeri";
import { IconPlus } from "@/components/icons";
import TombolHapusGaleri from "./TombolHapusGaleri";

export default async function GaleriPage() {
  const supabase = await createClient();
  const daftar = await getGaleri(supabase);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Galeri Kegiatan</h1>
          <p className="text-sm text-slate-500">
            Foto yang diunggah di sini tampil otomatis di beranda dan halaman
            Galeri publik — urut dari yang paling baru.
          </p>
        </div>
        <Link
          href="/dashboard/galeri/tambah"
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light"
        >
          <IconPlus className="h-4 w-4" />
          Tambah Foto
        </Link>
      </div>

      {daftar.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-14 text-center">
          <p className="text-sm text-slate-400">
            Belum ada foto kegiatan. Klik &quot;Tambah Foto&quot; untuk mulai
            mengisi galeri.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {daftar.map((item) => (
            <div
              key={item.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
            >
              <div className="aspect-[4/3] w-full bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.foto_url}
                  alt={item.judul}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="space-y-1.5 p-4">
                <p className="font-medium text-slate-800">{item.judul}</p>
                {item.deskripsi && (
                  <p className="line-clamp-2 text-xs text-slate-500">
                    {item.deskripsi}
                  </p>
                )}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">
                    {new Date(item.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <TombolHapusGaleri id={item.id} judul={item.judul} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
