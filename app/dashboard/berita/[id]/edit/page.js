import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBeritaById } from "@/lib/berita";
import FormBerita from "../../FormBerita";

export default async function EditBeritaPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const berita = await getBeritaById(supabase, id);
  if (!berita) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/berita" className="text-xs text-slate-400 hover:text-navy">
          &larr; Kembali ke Berita Desa
        </Link>
        <h1 className="mt-1 text-lg font-bold text-slate-800">Edit berita</h1>
      </div>
      <div className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <FormBerita berita={berita} />
      </div>
    </div>
  );
}
