import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import DetailLayananForm from "./DetailLayananForm";
import { linkWhatsApp } from "@/lib/whatsapp";
import { STATUS_LABELS, STATUS_BADGE_CLASS } from "@/lib/statusSurat";

export default async function DetailPengajuanLayananPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: pengajuan } = await supabase
    .from("pengajuan_layanan")
    .select("*, jenis_layanan_master(nama_layanan, kategori, form_schema)")
    .eq("id", id)
    .single();

  if (!pengajuan) notFound();

  let pemroses = null;
  if (pengajuan.diproses_oleh) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("nama")
      .eq("id", pengajuan.diproses_oleh)
      .single();
    pemroses = prof?.nama ?? null;
  }
  const wa = pengajuan.anonim
    ? null
    : linkWhatsApp(
        pengajuan.no_hp,
        `Halo ${pengajuan.nama_pemohon}, ini kantor desa terkait pengajuan ${pengajuan.kode_tracking}.`
      );

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
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-xs text-slate-400">{pengajuan.kode_tracking}</p>
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[pengajuan.status]}`}>
            {STATUS_LABELS[pengajuan.status]}
          </span>
        </div>
        <h1 className="mt-1 text-lg font-bold text-slate-800">
          {pengajuan.jenis_layanan_master?.nama_layanan}
        </h1>

        <dl className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          {pengajuan.anonim ? (
            <div className="sm:col-span-2">
              <dt className="text-slate-400">Pelapor</dt>
              <dd className="text-slate-700">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                  Anonim
                </span>
                <span className="ml-2 text-xs text-slate-400">
                  Identitas dirahasiakan oleh pelapor dan tidak tersimpan di sistem.
                </span>
              </dd>
            </div>
          ) : (
            <>
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
            <dd className="text-slate-700">
              {pengajuan.no_hp}
              {wa && (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-xs font-medium text-emerald-600 hover:underline"
                >
                  Hubungi via WhatsApp
                </a>
              )}
            </dd>
          </div>
            </>
          )}
          <div>
            <dt className="text-slate-400">Diajukan</dt>
            <dd className="text-slate-700">
              {new Date(pengajuan.created_at).toLocaleString("id-ID")}
            </dd>
          </div>
          {pengajuan.updated_at !== pengajuan.created_at && (
            <div className="sm:col-span-2">
              <dt className="text-slate-400">Terakhir diperbarui</dt>
              <dd className="text-slate-700">
                {new Date(pengajuan.updated_at).toLocaleString("id-ID")}
                {pemroses ? ` oleh ${pemroses}` : ""}
              </dd>
            </div>
          )}
          {pengajuan.jenis_pengaduan && (
            <div className="sm:col-span-2">
              <dt className="text-slate-400">Jenis pengaduan</dt>
              <dd className="text-slate-700">{pengajuan.jenis_pengaduan}</dd>
            </div>
          )}
          {pengajuan.keterangan && (
            <div className="sm:col-span-2">
              <dt className="text-slate-400">
                {pengajuan.jenis_pengaduan ? "Isi pengaduan" : "Keterangan"}
              </dt>
              <dd className="whitespace-pre-wrap text-slate-700">{pengajuan.keterangan}</dd>
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

      {!pengajuan.anonim && pengajuan.jenis_layanan_master?.kategori === "surat" && (
        <Link
          href={`/dashboard/layanan/${id}/surat`}
          className="flex items-center justify-between rounded-2xl border border-navy/20 bg-navy/5 p-5 transition hover:border-navy"
        >
          <div>
            <p className="font-semibold text-navy">Buat Surat</p>
            <p className="text-xs text-slate-500">
              Isi surat terisi otomatis dari data pemohon. Tinggal beri nomor, periksa, lalu cetak.
            </p>
          </div>
          <span className="text-navy">&rarr;</span>
        </Link>
      )}

      <DetailLayananForm pengajuan={pengajuan} />
    </div>
  );
}
