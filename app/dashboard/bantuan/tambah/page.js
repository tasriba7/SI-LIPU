import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { pastikanAdmin } from "@/lib/akses";
import HalamanTerbatas from "@/components/dashboard/HalamanTerbatas";
import FormTambahPenerima from "./FormTambahPenerima";

export const metadata = { title: "Tambah Penerima Bantuan" };

export default async function TambahPenerimaBantuanPage() {
  const supabase = await createClient();
  const akses = await pastikanAdmin(supabase);
  if (akses.error) return <HalamanTerbatas />;

  const { data: daftarJenis } = await supabase
    .from("jenis_bantuan")
    .select("id, nama, kategori")
    .eq("aktif", true)
    .order("urutan")
    .order("nama");

  const tahunIni = new Date().getFullYear().toString();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link href="/dashboard/bantuan" className="text-xs text-slate-400 hover:text-slate-600">
          &larr; Kembali ke Bantuan Desa
        </Link>
        <h1 className="mt-1 text-lg font-bold text-slate-800">Tambah Penerima Bantuan</h1>
        <p className="text-sm text-slate-500">
          Pilih jenis bantuan, lalu cari nama penerima dari Data Kependudukan. Bisa memilih banyak
          orang sekaligus untuk bantuan dan periode yang sama.
        </p>
      </div>

      <FormTambahPenerima daftarJenis={daftarJenis ?? []} periodeAwal={tahunIni} />
    </div>
  );
}
