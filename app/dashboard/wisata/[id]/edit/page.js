import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWisataById } from "@/lib/wisata";
import FormWisata from "../../FormWisata";

export default async function EditWisataPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const wisata = await getWisataById(supabase, id);
  if (!wisata) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/wisata" className="text-xs text-slate-400 hover:text-navy">
          &larr; Kembali ke Wisata Desa
        </Link>
        <h1 className="mt-1 text-lg font-bold text-slate-800">Edit: {wisata.nama}</h1>
      </div>
      <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <FormWisata wisata={wisata} />
      </div>
    </div>
  );
}
