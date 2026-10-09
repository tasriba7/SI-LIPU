import Image from "next/image";
import { createAdminClient } from "@/lib/supabase/admin";
import { cekTautan } from "@/lib/tautanData";
import GerbangTautan from "./GerbangTautan";
import PesanTautan from "./PesanTautan";

// Selalu hitung ulang & jangan di-cache: status tautan berubah setelah dipakai.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Data Desa | Tautan Sekali Pakai",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default async function DataBersamaPage({ params }) {
  const { token } = await params;
  const admin = createAdminClient();

  // Halaman ini HANYA MEMBACA. Tautan baru hangus saat penerima menekan
  // tombol konfirmasi, jadi pratinjau tautan di WhatsApp/email tidak
  // menghabiskan jatah satu kali.
  const { status, baris, desa } = await cekTautan(admin, token);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-center gap-3">
          <Image src="/logo-si-lipu.png" alt="Logo SI-LIPU" width={36} height={36} />
          <p className="text-sm font-bold text-slate-700">
            {[desa.jenis, desa.nama].filter(Boolean).join(" ") || "SI-LIPU"}
          </p>
        </div>

        {status === "aktif" ? (
          <GerbangTautan
            token={token}
            instansi={baris.instansi}
            keperluan={baris.keperluan}
            seksi={baris.seksi}
            kedaluwarsaPada={baris.kedaluwarsa_pada}
            desa={desa}
          />
        ) : (
          <PesanTautan status={status} desa={desa} />
        )}
      </div>
    </main>
  );
}
