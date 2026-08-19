import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import EditWargaForm from "./EditWargaForm";

export default async function EditWargaPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: warga } = await supabase
    .from("warga")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!warga) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/dashboard/kependudukan"
        className="text-sm text-slate-400 hover:text-slate-600"
      >
        &larr; Kembali ke daftar
      </Link>

      <div>
        <h1 className="text-lg font-bold text-slate-800">Edit Data Warga</h1>
        <p className="text-sm text-slate-500">{warga.nama_lengkap}</p>
      </div>

      <EditWargaForm warga={warga} />
    </div>
  );
}
