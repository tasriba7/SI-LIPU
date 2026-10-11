import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStrukturById, getStrukturAdmin, bangunPohon, idKeturunan } from "@/lib/strukturOrganisasi";
import { daftarPilihanAtasan } from "../../pilihanAtasan";
import FormStruktur from "../../FormStruktur";

export default async function EditStrukturPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const item = await getStrukturById(supabase, id);
  if (!item) notFound();

  // Atasan tidak boleh diri sendiri atau bawahannya: keluarkan dari pilihan.
  const semua = await getStrukturAdmin(supabase);
  const terlarang = idKeturunan(semua, id);
  const pilihan = daftarPilihanAtasan(bangunPohon(semua)).filter((p) => !terlarang.has(p.id));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/struktur-organisasi" className="text-xs text-slate-400 hover:text-navy">
          &larr; Kembali ke Struktur Organisasi
        </Link>
        <h1 className="mt-1 text-lg font-bold text-slate-800">Edit: {item.nama}</h1>
      </div>
      <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <FormStruktur item={item} pilihanAtasan={pilihan} />
      </div>
    </div>
  );
}
