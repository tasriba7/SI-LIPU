import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { bisaTerbitkanSurat } from "@/lib/roles";
import FormPindahKeluar from "./FormPindahKeluar";

export default async function PindahKeluarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profil } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  const boleh = bisaTerbitkanSurat(profil?.role);

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <Link href="/dashboard/kependudukan/mutasi" className="text-sm text-slate-400 hover:text-slate-600">
          &larr; Kembali ke Mutasi Penduduk
        </Link>
        <h1 className="mt-2 text-lg font-bold text-slate-800">Catat Pindah Keluar</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Untuk penduduk yang pindah ke luar desa. Datanya tidak dihapus, hanya tidak dihitung lagi
          dalam jumlah penduduk.
        </p>
      </div>

      {boleh ? (
        <FormPindahKeluar />
      ) : (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Pencatatan pindah keluar dilakukan oleh Administrator, Sekretaris Desa, Kaur, atau Kasi.
        </p>
      )}
    </div>
  );
}
