import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PublicHeader from "@/components/PublicHeader";
import FormPengajuan from "./FormPengajuan";

export default async function AjukanLayananPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: jenisLayanan } = await supabase
    .from("jenis_layanan_master")
    .select("*")
    .eq("id", id)
    .eq("aktif", true)
    .maybeSingle();

  if (!jenisLayanan) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <PublicHeader />
      <div className="flex items-center justify-center px-4 py-10">
        <FormPengajuan jenisLayanan={jenisLayanan} />
      </div>
    </main>
  );
}
