import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getConfigDesa } from "@/lib/configDesa";
import { bisaTerbitkanSurat } from "@/lib/roles";
import { susunVariabel } from "@/lib/suratTemplate";
import { ambilBerkasTtd } from "@/lib/suratBerkas";
import SuratEditor from "@/app/dashboard/layanan/[id]/surat/SuratEditor";

// Surat untuk pengajuan LAMA (tabel pengajuan_surat). Pola sama dengan
// /dashboard/layanan/[id]/surat; bedanya data diambil dari kolom tabel lama
// dan dilengkapi data kependudukan bila NIK-nya terdata.
export default async function BuatSuratLamaPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: lama } = await supabase
    .from("pengajuan_surat")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!lama) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profil } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };

  const [{ data: warga }, config, { data: templates }, { data: suratTerbit }, berkasTtd] =
    await Promise.all([
      supabase.from("warga").select("*").eq("nik", lama.nik).maybeSingle(),
      getConfigDesa(supabase),
      supabase.from("template_surat").select("*").eq("aktif", true).order("nama"),
      supabase.from("surat_terbit").select("*").eq("pengajuan_surat_id", id).maybeSingle(),
      ambilBerkasTtd(supabase),
    ]);

  // Sesuaikan bentuk pengajuan lama ke bentuk yang dipahami mesin template.
  const pengajuan = {
    nama_pemohon: lama.nama_pemohon,
    nik: lama.nik,
    keterangan: lama.keperluan,
    data_tambahan: { alamat: lama.alamat },
  };
  const vars = susunVariabel({ pengajuan, warga, config });

  const namaJenis = (lama.jenis_surat || "").toLowerCase();
  const tebakan =
    (templates || []).find((t) => t.kata_kunci?.some((k) => namaJenis.includes(k))) || null;

  return (
    <div className="space-y-4">
      <Link
        href={`/dashboard/surat/${id}`}
        className="text-sm text-slate-400 hover:text-slate-600 print:hidden"
      >
        &larr; Kembali ke detail pengajuan
      </Link>
      <h1 className="text-lg font-bold text-slate-800 print:hidden">
        Buat Surat — {lama.jenis_surat}
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
        sumber="lama"
        berkasTtd={berkasTtd}
      />
    </div>
  );
}
