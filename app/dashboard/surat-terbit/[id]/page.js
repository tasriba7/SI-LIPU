import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getConfigDesa } from "@/lib/configDesa";
import { ambilBerkasTtd, pilihGambar } from "@/lib/suratBerkas";
import SuratPratinjau from "@/components/dashboard/SuratPratinjau";
import TombolCetak from "./TombolCetak";

export default async function DetailSuratTerbitPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: surat }, config, berkas] = await Promise.all([
    supabase.from("surat_terbit").select("*").eq("id", id).maybeSingle(),
    getConfigDesa(supabase),
    ambilBerkasTtd(supabase),
  ]);
  if (!surat) notFound();

  // Snapshot lama (modul 0020) belum punya bidang blok kedua.
  const draf = { judul_atas: "", teks_tengah: "", biodata2: [], ...surat.isi };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/dashboard/surat-terbit" className="text-sm text-slate-400 hover:text-slate-600">
          &larr; Kembali ke daftar surat
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href={
              surat.pengajuan_surat_id
                ? `/dashboard/surat/${surat.pengajuan_surat_id}/surat`
                : `/dashboard/layanan/${surat.pengajuan_id}/surat`
            }
            className="text-sm text-slate-500 hover:text-navy"
          >
            Buka di editor
          </Link>
          <TombolCetak />
        </div>
      </div>
      <div className="overflow-x-auto">
        <SuratPratinjau
          draf={draf}
          nomor={surat.nomor_surat}
          tanggal={surat.tanggal_surat}
          kota={surat.isi?.kota}
          ttd={surat.isi?.penandatangan || {}}
          gambar={pilihGambar(berkas, surat.isi)}
          config={{
            nama_desa: config.nama_desa,
            jenis_wilayah: config.jenis_wilayah,
            kecamatan: config.kecamatan,
            kabupaten: config.kabupaten,
            alamat: config.alamat,
            logo_url: config.logo_url,
          }}
        />
      </div>
    </div>
  );
}
