import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS } from "@/lib/roles";
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
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-navy">Pendaftaran Kadus / Ketua RT</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500">
          Khusus calon Kepala Dusun atau Ketua RT. Pilih wilayah Anda — kalau
          slotnya masih kosong, pendaftaran akan diteruskan ke admin desa
          untuk disetujui.
        </p>
        <FormPendaftaran
          slotKosong={(slotKosong || []).map((s) => ({
            ...s,
            label: `${ROLE_LABELS[s.role]} — ${s.wilayah}`,
          }))}
        />
      </div>
    </main>
  );
}
