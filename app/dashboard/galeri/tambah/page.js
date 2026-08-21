import Link from "next/link";
import FormTambahGaleri from "./FormTambahGaleri";

export default function TambahGaleriPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/galeri"
          className="text-xs text-slate-400 hover:text-navy"
        >
          &larr; Kembali ke Galeri Kegiatan
        </Link>
        <h1 className="mt-1 text-lg font-bold text-slate-800">
          Tambah Foto Kegiatan
        </h1>
        <p className="text-sm text-slate-500">
          Unggah satu foto, beri judul kegiatan, dan rincian (opsional).
          Langsung tampil di beranda setelah disimpan.
        </p>
      </div>

      <div className="max-w-xl rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <FormTambahGaleri />
      </div>
    </div>
  );
}
