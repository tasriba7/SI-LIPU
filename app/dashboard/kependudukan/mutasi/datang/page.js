import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { bisaTerbitkanSurat } from "@/lib/roles";
import { ambilPilihanDusun } from "@/lib/wilayah";
import FormDatang from "./FormDatang";

export default async function DatangPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profil } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  const boleh = bisaTerbitkanSurat(profil?.role);
  const { pilihan } = boleh ? await ambilPilihanDusun(supabase) : { pilihan: [] };

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <Link href="/dashboard/kependudukan/mutasi" className="text-sm text-slate-400 hover:text-slate-600">
          &larr; Kembali ke Mutasi Penduduk
        </Link>
        <h1 className="mt-2 text-lg font-bold text-slate-800">Catat Penduduk Datang</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Untuk penduduk yang pindah masuk ke desa. Setelah dicatat, mereka langsung dihitung dalam
          jumlah penduduk.
        </p>
      </div>

      {boleh ? (
        <FormDatang pilihanDusun={pilihan} />
      ) : (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Pencatatan penduduk datang dilakukan oleh Administrator, Sekretaris Desa, Kaur, atau Kasi.
        </p>
      )}
    </div>
  );
}
