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
        Fase 1 selesai: login admin/petugas desa sudah aktif. Warga tidak
        perlu akun — modul layanan publik (pengajuan surat, pengaduan, dsb.)
        akan ditambahkan di fase berikutnya, bisa diakses langsung tanpa
        login.
      </p>

      <Link
        href="/login"
        className="mt-10 text-xs text-slate-400 underline hover:text-slate-600"
      >
        Login admin/petugas desa
      </Link>
    </main>
  );
}
