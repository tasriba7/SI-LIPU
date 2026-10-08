import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { pastikanAdmin } from "@/lib/akses";
import HalamanTerbatas from "@/components/dashboard/HalamanTerbatas";
import FormTambahTemplate from "./FormTambahTemplate";

export default async function TambahTemplateSuratPage() {
  const supabase = await createClient();
  const cek = await pastikanAdmin(supabase);
  if (cek.error) return <HalamanTerbatas />;

  const { data: daftar } = await supabase.from("template_surat").select("id, nama").order("nama");

  return (
    <div className="max-w-xl space-y-6">
      <Link href="/dashboard/template-surat" className="text-sm text-slate-400 hover:text-slate-600">
        &larr; Kembali ke daftar template
      </Link>
      <div>
        <h1 className="text-lg font-bold text-slate-800">Tambah Template Surat</h1>
        <p className="text-sm text-slate-500">
          Setelah dibuat, Anda langsung diarahkan ke halaman edit untuk menyusun isinya.
        </p>
      </div>
      <FormTambahTemplate daftar={daftar || []} />
    </div>
  );
}
