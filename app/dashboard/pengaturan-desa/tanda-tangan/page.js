import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { pastikanAdmin } from "@/lib/akses";
import { ambilBerkasTtd } from "@/lib/suratBerkas";
import HalamanTerbatas from "@/components/dashboard/HalamanTerbatas";
import FormTandaTangan from "./FormTandaTangan";

export default async function TandaTanganPage() {
  const supabase = await createClient();
  const cek = await pastikanAdmin(supabase);
  if (cek.error) return <HalamanTerbatas />;

  const berkas = await ambilBerkasTtd(supabase);

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/dashboard/pengaturan-desa" className="text-sm text-slate-400 hover:text-slate-600">
        &larr; Kembali ke Pengaturan Desa
      </Link>
      <div>
        <h1 className="text-lg font-bold text-slate-800">Tanda Tangan &amp; Stempel</h1>
        <p className="text-sm text-slate-500">
          Gambar disimpan privat (hanya terlihat oleh staf yang login) dan baru dicetak pada surat
          bila petugas mencentangnya saat menerbitkan.
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <FormTandaTangan berkas={berkas} />
      </div>
    </div>
  );
}
