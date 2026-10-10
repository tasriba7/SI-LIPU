import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getWisataAdmin, labelKategori } from "@/lib/wisata";
import { bisaMenulis } from "@/lib/roles";
import { IconPlus } from "@/components/icons";
import TombolAksiWisata from "./TombolAksiWisata";

export default async function WisataAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profil } = await supabase.from("profiles").select("role").eq("id", user?.id).single();
  const boleh = bisaMenulis(profil?.role);
  const daftar = await getWisataAdmin(supabase);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Wisata Desa</h1>
          <p className="text-sm text-slate-500">
            Destinasi yang diisi di sini tampil di beranda (maksimal 4, unggulan didahulukan) dan di
            halaman Wisata publik.
          </p>
        </div>
        {boleh && (
          <Link
            href="/dashboard/wisata/tambah"
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light"
          >
            <IconPlus className="h-4 w-4" />
            Tambah Wisata
          </Link>
        )}
      </div>

      {daftar.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-14 text-center">
          <p className="text-sm text-slate-400">
            Belum ada data wisata.{boleh ? ' Klik "Tambah Wisata" untuk mulai.' : ""}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {daftar.map((w) => (
            <div
              key={w.id}
              className={`overflow-hidden rounded-2xl border bg-white ${
                w.aktif ? "border-slate-200" : "border-dashed border-slate-300 opacity-75"
              }`}
            >
              <div className="relative aspect-[4/3] w-full bg-slate-100">
                {w.foto_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={w.foto_url} alt={w.nama} className="h-full w-full object-cover" />
                )}
                <div className="absolute left-2 top-2 flex gap-1.5">
                  {w.unggulan && (
                    <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-semibold text-navy-dark">Unggulan</span>
                  )}
                  {!w.aktif && (
                    <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-semibold text-white">Disembunyikan</span>
                  )}
                </div>
              </div>
              <div className="space-y-1.5 p-4">
                <p className="font-medium text-slate-800">{w.nama}</p>
                <p className="text-xs text-slate-400">
                  {labelKategori(w.kategori)}
                  {w.lokasi ? ` · ${w.lokasi}` : ""}
                </p>
                {boleh && (
                  <div className="space-y-2 pt-2">
                    <Link href={`/dashboard/wisata/${w.id}/edit`} className="text-xs font-medium text-navy hover:underline">
                      Edit data
                    </Link>
                    <TombolAksiWisata id={w.id} nama={w.nama} aktif={w.aktif} unggulan={w.unggulan} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
