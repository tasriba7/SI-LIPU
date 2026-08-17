import Image from "next/image";

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
        Fase 0 selesai: proyek Next.js sudah tersambung ke Supabase, siap
        di-deploy ke Vercel, dan splash screen logo sudah aktif. Halaman ini
        adalah placeholder — modul layanan (surat-menyurat, pengaduan, dsb.)
        akan ditambahkan di fase berikutnya.
      </p>
    </main>
  );
}
