import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/roles";
import { getFotoHero, MAKS_FOTO_HERO } from "@/lib/fotoHero";
import PengelolaFoto from "./PengelolaFoto";

export default async function FotoBerandaAdminPage() {
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
        <p className="mt-2 text-sm text-amber-700">Halaman ini hanya bisa diakses oleh Administrator.</p>
      </div>
    );
  }

  const foto = await getFotoHero(supabase);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/pengaturan-desa" className="text-xs text-navy underline">
          &larr; Pengaturan Desa
        </Link>
        <h1 className="mt-2 text-lg font-bold text-slate-800">Foto Beranda</h1>
        <p className="text-sm text-slate-500">
          Foto latar di bagian atas beranda. Kalau ada lebih dari satu, foto berganti otomatis tiap
          10 detik sesuai urutan di bawah. Format JPG/PNG/WEBP, maksimal 8MB per foto, maksimal{" "}
          {MAKS_FOTO_HERO} foto. Gunakan foto lebar (landscape) beresolusi tinggi agar tampil tajam.
        </p>
      </div>

      <PengelolaFoto foto={foto} maks={MAKS_FOTO_HERO} />
    </div>
  );
}
