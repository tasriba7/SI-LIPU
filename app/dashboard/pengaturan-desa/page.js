import { createClient } from "@/lib/supabase/server";
import { getConfigDesa } from "@/lib/configDesa";
import FormPengaturanDesa from "./FormPengaturanDesa";

export default async function PengaturanDesaPage() {
  const supabase = await createClient();
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
