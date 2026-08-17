import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 text-center">
      <Image
        src="/logo-si-lipu.png"
        alt="Logo SI-LIPU"
        width={96}
        height={96}
        className="mb-4"
      />
      <h1 className="text-2xl font-bold text-navy">SI-LIPU</h1>
      <p className="text-slate-500 mt-1 mb-8">
        Sistem Informasi Layanan Interaktif Pelayanan Umum
      </p>
      <p className="max-w-md text-slate-600">
        Layanan warga tanpa perlu akun — ajukan surat langsung lewat form,
        lalu cek statusnya kapan saja pakai kode tracking.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/layanan/surat"
          className="rounded-lg bg-navy px-6 py-2.5 text-sm font-medium text-white transition hover:bg-navy-light"
        >
          Ajukan Surat
        </Link>
        <Link
          href="/layanan/surat/cek"
          className="rounded-lg border border-slate-300 px-6 py-2.5 text-sm font-medium text-slate-600 transition hover:border-navy-light hover:text-navy"
        >
          Cek Status Pengajuan
        </Link>
      </div>

      <Link
        href="/login"
        className="mt-10 text-xs text-slate-400 underline hover:text-slate-600"
      >
        Login admin/petugas desa
      </Link>
    </main>
  );
}
