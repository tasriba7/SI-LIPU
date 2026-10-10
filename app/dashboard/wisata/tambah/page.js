import Link from "next/link";
import FormWisata from "../FormWisata";

export default function TambahWisataPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/wisata" className="text-xs text-slate-400 hover:text-navy">
          &larr; Kembali ke Wisata Desa
        </Link>
        <h1 className="mt-1 text-lg font-bold text-slate-800">Tambah Wisata</h1>
        <p className="text-sm text-slate-500">Langsung tampil di beranda dan halaman Wisata setelah disimpan.</p>
      </div>
      <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <FormWisata />
      </div>
    </div>
  );
}
