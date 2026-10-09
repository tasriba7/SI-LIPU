import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { pastikanBisaTerbitkanSurat } from "@/lib/akses";
import FormBuatSurat from "./FormBuatSurat";

export default async function BuatSuratLangsungPage({ searchParams }) {
  const sp = await searchParams;
  const supabase = await createClient();

  const akses = await pastikanBisaTerbitkanSurat(supabase);
  if (akses.error) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-lg font-bold text-amber-800">Halaman Terbatas</h1>
        <p className="mt-2 text-sm text-amber-700">{akses.error}</p>
      </div>
    );
  }

  // Semua jenis surat (termasuk yang tidak dibuka untuk warga), karena petugas
  // boleh membuat surat apa saja.
  const [{ data: jenisList }, { data: templates }] = await Promise.all([
    supabase
      .from("jenis_layanan_master")
      .select("id, nama_layanan, aktif, form_schema")
      .eq("kategori", "surat")
      .order("nama_layanan"),
    supabase.from("template_surat").select("nama, kata_kunci").eq("aktif", true).order("nama"),
  ]);

  const daftar = jenisList || [];
  const jenisAwalId = daftar.some((j) => j.id === sp?.jenis) ? sp.jenis : "";

  // Template aktif yang belum punya jenis surat pasangan tidak bisa dipilih di sini.
  const namaJenis = daftar.map((j) => j.nama_layanan.toLowerCase());
  const templateTanpaJenis = (templates || []).filter(
    (t) => !(t.kata_kunci || []).some((k) => namaJenis.some((n) => n.includes(k)))
  );

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/dashboard/layanan"
        className="text-sm text-slate-400 hover:text-slate-600"
      >
        &larr; Kembali ke daftar pengajuan
      </Link>

      <div>
        <h1 className="text-lg font-bold text-slate-800">Buat Surat Langsung</h1>
        <p className="text-sm text-slate-500">
          Untuk warga yang datang ke kantor desa. Pilih jenis surat dan penduduknya, data terisi
          otomatis dari Data Kependudukan, lalu lanjut ke editor untuk nomor, tanda tangan, dan
          cetak.
        </p>
      </div>

      {daftar.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Belum ada jenis surat. Tambahkan dulu di{" "}
          <Link href="/dashboard/jenis-layanan/tambah" className="text-navy underline">
            Kelola Jenis Layanan
          </Link>{" "}
          dengan kategori Surat.
        </p>
      ) : (
        <FormBuatSurat jenisList={daftar} jenisAwalId={jenisAwalId} />
      )}

      {templateTanpaJenis.length > 0 && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Template berikut belum punya jenis surat, jadi belum muncul di pilihan:{" "}
          <strong>{templateTanpaJenis.map((t) => t.nama).join(", ")}</strong>. Tambahkan jenis
          layanan berkategori Surat dengan nama yang memuat kata kuncinya di{" "}
          <Link href="/dashboard/jenis-layanan/tambah" className="underline">
            Kelola Jenis Layanan
          </Link>
          .
        </p>
      )}
    </div>
  );
}
