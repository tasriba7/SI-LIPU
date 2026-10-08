import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { pastikanAdmin } from "@/lib/akses";
import HalamanTerbatas from "@/components/dashboard/HalamanTerbatas";
import { VARIABEL_BAWAAN } from "@/lib/suratTemplate";
import FormTemplate from "./FormTemplate";

export default async function EditTemplateSuratPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const cek = await pastikanAdmin(supabase);
  if (cek.error) return <HalamanTerbatas />;

  const [{ data: template }, { data: layanan }] = await Promise.all([
    supabase.from("template_surat").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("jenis_layanan_master")
      .select("nama_layanan, form_schema")
      .eq("kategori", "surat")
      .order("nama_layanan"),
  ]);
  if (!template) notFound();

  // Isian Form Builder yang bisa dipakai sebagai {{field_key}}, per layanan.
  const variabelLayanan = (layanan || [])
    .map((l) => ({
      nama: l.nama_layanan,
      fields: (Array.isArray(l.form_schema) ? l.form_schema : []).map((f) => ({
        kunci: f.field_key,
        label: f.label,
        tanggal: f.tipe === "tanggal",
      })),
    }))
    .filter((l) => l.fields.length > 0);

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/dashboard/template-surat" className="text-sm text-slate-400 hover:text-slate-600">
        &larr; Kembali ke daftar template
      </Link>
      <div>
        <h1 className="text-lg font-bold text-slate-800">Edit Template — {template.nama}</h1>
        <p className="text-sm text-slate-500">
          Tulis <code className="rounded bg-slate-100 px-1">{"{{nama_variabel}}"}</code> di
          bagian mana pun; sistem mengisinya otomatis saat surat dibuat.
        </p>
      </div>

      <FormTemplate template={template} />

      <details className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
        <summary className="cursor-pointer font-medium text-slate-700">Lihat daftar variabel</summary>
        <div className="mt-3 space-y-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-slate-400">Bawaan</p>
            <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
              {VARIABEL_BAWAAN.map((v) => (
                <li key={v.kunci} className="text-xs text-slate-600">
                  <code className="rounded bg-slate-100 px-1">{`{{${v.kunci}}}`}</code> — {v.ket}
                </li>
              ))}
            </ul>
          </div>
          {variabelLayanan.map((l) => (
            <div key={l.nama}>
              <p className="mb-1 text-xs font-semibold uppercase text-slate-400">
                Isian form: {l.nama}
              </p>
              <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                {l.fields.map((f) => (
                  <li key={f.kunci} className="text-xs text-slate-600">
                    <code className="rounded bg-slate-100 px-1">{`{{${f.kunci}}}`}</code> — {f.label}
                    {f.tanggal && (
                      <span className="block text-slate-400">
                        juga: {`{{${f.kunci}_angka}}`} (22-09-1999) dan {`{{${f.kunci}_hari}}`} (Rabu)
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="text-xs text-slate-400">
            Khusus: <code className="rounded bg-slate-100 px-1">{"{{usia_almarhum}}"}</code> dihitung
            otomatis dari tanggal lahir &amp; tanggal meninggal;{" "}
            <code className="rounded bg-slate-100 px-1">{"{{alamat_anak}}"}</code> dan{" "}
            <code className="rounded bg-slate-100 px-1">{"{{alamat_almarhum}}"}</code> memakai alamat
            pemohon bila dikosongkan.
          </p>
        </div>
      </details>
    </div>
  );
}
