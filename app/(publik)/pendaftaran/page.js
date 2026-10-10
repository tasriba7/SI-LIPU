import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS } from "@/lib/roles";
import BannerHalaman from "@/components/BannerHalaman";
import FormPendaftaran from "./FormPendaftaran";

export default async function PendaftaranPage() {
  const supabase = await createClient();
  const { data: slotKosong } = await supabase
    .from("posisi_perangkat_publik")
    .select("id, role, wilayah")
    .eq("status", "kosong")
    .order("role")
    .order("wilayah");

  return (
    <main className="min-h-screen bg-slate-50">
      <BannerHalaman
        kunci="pendaftaran"
        kecil="Perangkat Desa"
        judul="Pendaftaran Akun"
        ringkas
      />
      <div className="flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-sm">
        <h2 className="text-xl font-bold text-navy">Pendaftaran Akun</h2>
        <p className="mb-6 mt-1 text-sm text-slate-500">
          Buat akun login untuk perangkat desa (Kepala Dusun atau Ketua RT) agar bisa
          mengelola data warga di wilayahnya. Pilih wilayah Anda — kalau slotnya masih
          kosong, pendaftaran akan diteruskan ke admin desa untuk disetujui.
        </p>
        <FormPendaftaran
          slotKosong={(slotKosong || []).map((s) => ({
            ...s,
            label: `${ROLE_LABELS[s.role]} — ${s.wilayah}`,
          }))}
        />
      </div>
      </div>
    </main>
  );
}
