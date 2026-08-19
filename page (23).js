import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import DetailLayananForm from "./DetailLayananForm";

export default async function DetailPengajuanLayananPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: pengajuan } = await supabase
    .from("pengajuan_layanan")
    .select("*, jenis_layanan_master(nama_layanan, form_schema)")
    .eq("id", id)
    .single();

  if (!pengajuan) notFound();

  const formSchema = pengajuan.jenis_layanan_master?.form_schema || [];

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/dashboard/layanan"
        className="text-sm text-slate-400 hover:text-slate-600"
      >
        &larr; Kembali ke daftar
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <p className="font-mono text-xs text-slate-400">{pengajuan.kode_tracking}</p>
        <h1 className="mt-1 text-lg font-bold text-slate-800">
          {pengajuan.jenis_layanan_master?.nama_layanan}
        </h1>

        <dl className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-400">Nama pemohon</dt>
            <dd className="text-slate-700">{pengajuan.nama_pemohon}</dd>
          </div>
          <div>
            <dt className="text-slate-400">NIK</dt>
            <dd className="text-slate-700">{pengajuan.nik}</dd>
          </div>
          <div>
            <dt className="text-slate-400">No. HP</dt>
            <dd className="text-slate-700">{pengajuan.no_hp}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Diajukan</dt>
            <dd className="text-slate-700">
              {new Date(pengajuan.created_at).toLocaleString("id-ID")}
            </dd>
          </div>
          {pengajuan.keterangan && (
            <div className="sm:col-span-2">
              <dt className="text-slate-400">Keterangan</dt>
              <dd className="text-slate-700">{pengajuan.keterangan}</dd>
            </div>
          )}
          {formSchema.map((field) => (
            <div key={field.field_key} className="sm:col-span-2">
              <dt className="text-slate-400">{field.label}</dt>
              <dd className="text-slate-700">
                {pengajuan.data_tambahan?.[field.field_key] || "-"}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <DetailLayananForm pengajuan={pengajuan} />
    </div>
  );
}
