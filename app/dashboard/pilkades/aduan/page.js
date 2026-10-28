import PantauLayanan from "@/components/dashboard/PantauLayanan";
import { createClient } from "@/lib/supabase/server";
import { ambilRole } from "@/lib/akses";
import { bisaUbahPilkades } from "@/lib/roles";

export const metadata = { title: "Aduan Warga (Pilkades)" };

// Aduan warga bertema Pilkades untuk Panitia Pilkades (dan Administrator), hanya lihat.
// Sumber data: view pilkades_aduan_pantau (migrasi 0069), tanpa NIK/No. HP.
export default async function AduanPilkadesPage({ searchParams }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { role } = await ambilRole(supabase);
  const panitia = bisaUbahPilkades(role);

  return (
    <div className="mx-auto max-w-5xl">
      <PantauLayanan
        sp={sp}
        basePath="/dashboard/pilkades/aduan"
        kategori="pengaduan"
        sumber="pilkades_aduan_pantau"
        detailBase="/dashboard/pilkades/aduan"
        judul="Aduan Warga seputar Pilkades"
        deskripsi="Aduan dari warga yang berjenis Pilkades dan bagaimana desa menanganinya. Klik kode untuk melihat isi dan alur penanganan."
        catatan={
          <p className="mt-2 max-w-3xl text-xs text-slate-500">
            {panitia
              ? "Aduan yang mengadukan panitia sendiri (ketidaknetralan, kinerja panitia) tidak tampil di sini; itu ditangani Administrator desa. Status dan catatan penanganan diisi oleh petugas desa di menu Pengajuan Layanan."
              : "Sebagai Administrator, Anda melihat semua aduan Pilkades, termasuk yang mengadukan panitia. Penanganan dilakukan di menu Pengajuan Layanan."}
          </p>
        }
      />
    </div>
  );
}
