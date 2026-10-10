import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/roles";
import { getProfilDesa } from "@/lib/profilDesa";
import FormProfilDesa from "./FormProfilDesa";

export default async function ProfilDesaAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profileSaya } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id)
    .single();

  if (!isAdminRole(profileSaya?.role)) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-lg font-bold text-amber-800">Halaman Terbatas</h1>
        <p className="mt-2 text-sm text-amber-700">
          Halaman ini hanya bisa diakses oleh Administrator.
        </p>
      </div>
    );
  }

  const { profil, siap } = await getProfilDesa(supabase);

  return (
    <div className="space-y-5">
      <div>
        <Link href="/dashboard/pengaturan-desa" className="text-sm text-slate-400 hover:text-slate-600">
          &larr; Kembali ke Pengaturan Desa
        </Link>
        <h1 className="mt-2 text-lg font-bold text-slate-800">Profil Desa</h1>
        <p className="text-sm text-slate-500">
          Isi sejarah, visi-misi, dan batas wilayah. Hasilnya tampil di halaman publik{" "}
          <Link href="/profil" target="_blank" className="font-medium text-navy underline">
            /profil
          </Link>
          .
        </p>
      </div>

      {!siap && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Kolom profil belum ada di database. Jalankan migrasi{" "}
          <code className="font-mono">0035_profil_desa_lengkap.sql</code> di Supabase SQL Editor
          dulu, lalu muat ulang halaman ini.
        </p>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <FormProfilDesa profil={profil} />
      </div>
    </div>
  );
}
