import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import DetailSuratForm from "./DetailSuratForm";

export default async function DetailSuratPage({ params }) {
  const supabase = await createClient();
  const { data: surat } = await supabase
    .from("pengajuan_surat")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!surat) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/dashboard/surat"
        className="text-sm text-slate-400 hover:text-slate-600"
      >
        &larr; Kembali ke daftar
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <p className="font-mono text-xs text-slate-400">{surat.kode_tracking}</p>
        <h1 className="mt-1 text-lg font-bold text-slate-800">
          {surat.jenis_surat}
        </h1>

        <dl className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-400">Nama pemohon</dt>
            <dd className="text-slate-700">{surat.nama_pemohon}</dd>
          </div>
          <div>
            <dt className="text-slate-400">NIK</dt>
            <dd className="text-slate-700">{surat.nik}</dd>
          </div>
          <div>
            <dt className="text-slate-400">No. HP</dt>
            <dd className="text-slate-700">{surat.no_hp}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Diajukan</dt>
            <dd className="text-slate-700">
              {new Date(surat.created_at).toLocaleString("id-ID")}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-400">Alamat</dt>
            <dd className="text-slate-700">{surat.alamat}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-400">Keperluan</dt>
            <dd className="text-slate-700">{surat.keperluan}</dd>
          </div>
        </dl>
      </div>

      <DetailSuratForm surat={surat} />
    </div>
  );
}
