import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getStrukturAdmin, bangunPohon } from "@/lib/strukturOrganisasi";
import { daftarPilihanAtasan } from "../pilihanAtasan";
import FormStruktur from "../FormStruktur";

export default async function TambahStrukturPage({ searchParams }) {
  const { atasan } = await searchParams;
  const supabase = await createClient();
  const semua = await getStrukturAdmin(supabase);
  const pilihan = daftarPilihanAtasan(bangunPohon(semua));
  const atasanAwal = pilihan.some((p) => p.id === atasan) ? atasan : "";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/struktur-organisasi" className="text-xs text-slate-400 hover:text-navy">
          &larr; Kembali ke Struktur Organisasi
        </Link>
        <h1 className="mt-1 text-lg font-bold text-slate-800">Tambah Jabatan</h1>
        <p className="text-sm text-slate-500">Langsung tampil di bagan beranda setelah disimpan.</p>
      </div>
      <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <FormStruktur pilihanAtasan={pilihan} atasanAwal={atasanAwal} />
      </div>
    </div>
  );
}
