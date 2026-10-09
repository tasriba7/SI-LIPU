import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getConfigDesa } from "@/lib/configDesa";
import { bisaTerbitkanSurat } from "@/lib/roles";
import { susunVariabel } from "@/lib/suratTemplate";
import { ambilBerkasTtd } from "@/lib/suratBerkas";
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

  const [{ data: warga }, config, { data: templates }, { data: suratTerbit }, berkasTtd] =
    await Promise.all([
      pengajuan.warga_id
        ? supabase.from("warga").select("*").eq("id", pengajuan.warga_id).maybeSingle()
        : Promise.resolve({ data: null }),
      getConfigDesa(supabase),
      supabase.from("template_surat").select("*").eq("aktif", true).order("nama"),
      supabase.from("surat_terbit").select("*").eq("pengajuan_id", id).maybeSingle(),
      ambilBerkasTtd(supabase),
    ]);

  const vars = susunVariabel({ pengajuan, warga, config });

  // Surat kematian: tanggal meninggal dari isian form, dan catatan mutasi bila
  // surat ini sudah pernah menandai seseorang meninggal (migrasi 0032).
  const tglIsian = String(pengajuan.data_tambahan?.tanggal_meninggal ?? "").slice(0, 10);
  const tanggalMeninggalAwal = /^\d{4}-\d{2}-\d{2}$/.test(tglIsian) ? tglIsian : "";
  let mutasiTerhubung = null;
  if (suratTerbit?.id) {
    const { data: mt } = await supabase
      .from("mutasi_penduduk")
      .select("tanggal, warga(nama_lengkap)")
      .eq("surat_terbit_id", suratTerbit.id)
      .is("dibatalkan_pada", null)
      .maybeSingle();
    if (mt) mutasiTerhubung = { nama: mt.warga?.nama_lengkap || "", tanggal: mt.tanggal };
  }

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
        sumber="layanan"
        berkasTtd={berkasTtd}
        tanggalMeninggalAwal={tanggalMeninggalAwal}
        mutasiTerhubung={mutasiTerhubung}
      />
    </div>
  );
}
