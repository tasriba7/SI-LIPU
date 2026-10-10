import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBeritaAdmin, labelKategoriBerita, tanggalIndo } from "@/lib/berita";
import { bisaMenulis } from "@/lib/roles";
import { IconPlus } from "@/components/icons";
import TombolAksiBerita from "./TombolAksiBerita";

export default async function BeritaAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profil } = await supabase.from("profiles").select("role").eq("id", user?.id).single();
  const boleh = bisaMenulis(profil?.role);
  const daftar = await getBeritaAdmin(supabase);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Berita Desa</h1>
          <p className="text-sm text-slate-500">
            Berita yang diterbitkan tampil di beranda (3 terbaru) dan halaman Berita. Draf hanya terlihat di sini.
          </p>
        </div>
        {boleh && (
          <Link
            href="/dashboard/berita/tambah"
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light"
          >
            <IconPlus className="h-4 w-4" />
            Tulis Berita
          </Link>
        )}
      </div>

      {daftar.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-14 text-center">
          <p className="text-sm text-slate-400">
            Belum ada berita.{boleh ? ' Klik "Tulis Berita" untuk mulai.' : ""}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {daftar.map((b) => (
            <div key={b.id} className="flex gap-4 p-4">
              <div className="hidden h-20 w-32 shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:block">
                {b.foto_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.foto_url} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      b.terbit ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {b.terbit ? "Terbit" : "Draf"}
                  </span>
                  <span className="text-xs text-slate-400">
                    {labelKategoriBerita(b.kategori)}
                    {b.tanggal_terbit ? ` · ${tanggalIndo(b.tanggal_terbit)}` : ""}
                  </span>
                </div>
                <p className="line-clamp-2 font-medium text-slate-800">{b.judul}</p>
                {boleh && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
                    <Link href={`/dashboard/berita/${b.id}/edit`} className="text-xs font-medium text-navy hover:underline">
                      Edit
                    </Link>
                    {b.terbit && (
                      <Link href={`/berita/${b.id}`} target="_blank" className="text-xs font-medium text-slate-500 hover:underline">
                        Lihat
                      </Link>
                    )}
                    <TombolAksiBerita id={b.id} judul={b.judul} terbit={b.terbit} />
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
