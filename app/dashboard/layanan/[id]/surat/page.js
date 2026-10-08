import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getConfigDesa } from "@/lib/configDesa";
import { bisaTerbitkanSurat } from "@/lib/roles";
import { susunVariabel } from "@/lib/suratTemplate";
import SuratEditor from "./SuratEditor";

export default async function BuatSuratPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: pengajuan } = await supabase
    .from("pengajuan_layanan")
    .select("*, jenis_layanan_master(nama_layanan)")
    .eq("id", id)
    .maybeSingle();
  if (!pengajuan) notFound();

  const kembali = (
    <Link
      href={`/dashboard/layanan/${id}`}
      className="text-sm text-slate-400 hover:text-slate-600 print:hidden"
    >
      &larr; Kembali ke detail pengajuan
    </Link>
  );

  if (pengajuan.anonim) {
    return (
      <div className="max-w-2xl space-y-4">
        {kembali}
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Pengajuan anonim tidak memiliki identitas pemohon, sehingga tidak bisa dibuatkan surat.
        </p>
      </div>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profil } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };

  const [{ data: warga }, config, { data: templates }, { data: suratTerbit }] =
    await Promise.all([
      pengajuan.warga_id
        ? supabase.from("warga").select("*").eq("id", pengajuan.warga_id).maybeSingle()
        : Promise.resolve({ data: null }),
      getConfigDesa(supabase),
      supabase.from("template_surat").select("*").eq("aktif", true).order("nama"),
      supabase.from("surat_terbit").select("*").eq("pengajuan_id", id).maybeSingle(),
    ]);

  const vars = susunVariabel({ pengajuan, warga, config });

  // Tebak template dari nama layanan (kata kunci di template_surat.kata_kunci).
  const namaLayanan = (pengajuan.jenis_layanan_master?.nama_layanan || "").toLowerCase();
  const tebakan =
    (templates || []).find((t) => t.kata_kunci?.some((k) => namaLayanan.includes(k))) ||
    null;

  return (
    <div className="space-y-4">
      {kembali}
      <h1 className="text-lg font-bold text-slate-800 print:hidden">
        Buat Surat — {pengajuan.jenis_layanan_master?.nama_layanan}
      </h1>
      <SuratEditor
        pengajuanId={id}
        templates={templates || []}
        templateAwalId={suratTerbit?.template_id || tebakan?.id || null}
        vars={vars}
        suratTerbit={suratTerbit}
        config={{
          nama_desa: config.nama_desa,
          jenis_wilayah: config.jenis_wilayah,
          kecamatan: config.kecamatan,
          kabupaten: config.kabupaten,
          alamat: config.alamat,
          logo_url: config.logo_url,
          kepala_desa_nama: config.kepala_desa_nama,
        }}
        bolehTerbitkan={bisaTerbitkanSurat(profil?.role)}
        wargaTerhubung={!!warga}
      />
    </div>
  );
}
