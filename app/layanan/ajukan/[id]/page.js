import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <FormPengajuan jenisLayanan={jenisLayanan} />
    </main>
  );
}
