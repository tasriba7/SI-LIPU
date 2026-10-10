import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/roles";
import { HALAMAN_BANNER, getSemuaBanner } from "@/lib/bannerHalaman";
import KartuBanner from "./KartuBanner";

export default async function BannerHalamanAdminPage() {
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

  const banner = await getSemuaBanner(supabase);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/pengaturan-desa" className="text-xs text-navy underline">
          &larr; Pengaturan Desa
        </Link>
        <h1 className="mt-2 text-lg font-bold text-slate-800">Banner Halaman</h1>
        <p className="text-sm text-slate-500">
          Gambar latar yang tampil di bawah header pada tiap menu publik. Format JPG/PNG/WEBP,
          maksimal 8MB. Gunakan foto lebar (landscape) agar tampil bagus. Foto beranda diatur
          terpisah di halaman Pengaturan Desa.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {HALAMAN_BANNER.map((h) => (
          <KartuBanner
            key={h.kunci}
            kunci={h.kunci}
            nama={h.nama}
            href={h.href}
            gambarUrl={banner[h.kunci] ?? null}
          />
        ))}
      </div>
    </div>
  );
}
