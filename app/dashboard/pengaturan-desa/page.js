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
          Halaman ini hanya bisa diakses oleh Kepala Desa atau Sekretaris
          Desa. Hubungi Kepala Desa/Sekretaris Desa kalau identitas desa
          perlu diperbarui.
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

      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <FormPengaturanDesa config={config} />
      </div>
    </div>
  );
}
