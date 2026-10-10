import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getConfigDesa } from "@/lib/configDesa";
import { isAdminRole } from "@/lib/roles";
import FormPengaturanDesa from "./FormPengaturanDesa";

export default async function PengaturanDesaPage() {
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
          Halaman ini hanya bisa diakses oleh Administrator. Hubungi
          Administrator desa kalau identitas desa perlu diperbarui.
        </p>
      </div>
    );
  }

  const config = await getConfigDesa(supabase);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-slate-800">Pengaturan Desa</h1>
        <p className="text-sm text-slate-500">
          Identitas desa/kelurahan ini akan tampil di bagian atas halaman utama (beranda) —
          termasuk foto latar yang dipilih di bawah.
        </p>
      </div>

      <Link
        href="/dashboard/pengaturan-desa/profil"
        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-sm transition hover:border-navy"
      >
        <span>
          <span className="font-semibold text-slate-700">Profil Desa</span>
          <span className="block text-xs text-slate-400">
            Sejarah, visi-misi, dan batas wilayah untuk halaman publik /profil
          </span>
        </span>
        <span className="text-navy">&rarr;</span>
      </Link>

      <Link
        href="/dashboard/pengaturan-desa/tanda-tangan"
        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-sm transition hover:border-navy"
      >
        <span>
          <span className="font-semibold text-slate-700">Tanda Tangan &amp; Stempel</span>
          <span className="block text-xs text-slate-400">Gambar untuk dicetak pada surat resmi</span>
        </span>
        <span className="text-navy">&rarr;</span>
      </Link>

      <Link
        href="/dashboard/pengaturan-desa/bagikan-data"
        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-sm transition hover:border-navy"
      >
        <span>
          <span className="font-semibold text-slate-700">Bagikan Data ke Instansi</span>
          <span className="block text-xs text-slate-400">
            Buat tautan sekali pakai untuk lembaga yang meminta data desa
          </span>
        </span>
        <span className="text-navy">&rarr;</span>
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <FormPengaturanDesa config={config} />
      </div>
    </div>
  );
}
