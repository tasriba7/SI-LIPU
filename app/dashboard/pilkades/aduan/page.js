import PantauLayanan from "@/components/dashboard/PantauLayanan";
import { createClient } from "@/lib/supabase/server";
import { ambilRole } from "@/lib/akses";
import { bisaUbahPilkades } from "@/lib/roles";
import TabelAduan from "./TabelAduan";

export const metadata = { title: "Aduan Warga (Pilkades)" };

// Aduan warga bertema Pilkades untuk Panitia Pilkades (dan Administrator). Panitia membuka isi
// aduan lewat "Lihat isi aduan" dan membalasnya di halaman detail (migrasi 0070).
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
        labelLihat="Lihat isi aduan"
        Tabel={TabelAduan}
        bolehHapus={panitia}
        kelompok={[
          { key: "diajukan", label: "Diajukan", status: ["diajukan"], badge: "bg-slate-100 text-slate-600" },
          {
            key: "selesai_diproses",
            label: "Selesai diproses",
            status: ["diproses", "selesai", "ditolak"],
            badge: "bg-emerald-100 text-emerald-700",
          },
        ]}
        judul="Aduan Warga seputar Pilkades"
        deskripsi="Aduan dari warga yang berjenis Pilkades dan bagaimana desa menanganinya. Klik tombol Lihat isi aduan untuk membaca isinya, lalu balas."
        catatan={
          <p className="mt-2 max-w-3xl text-xs text-slate-500">
            {panitia
              ? "Aduan yang mengadukan panitia sendiri (ketidaknetralan, kinerja panitia) tidak tampil di sini; itu ditangani Administrator desa. Panitia cukup membalas aduan; yang sudah Selesai diproses boleh dihapus."
              : "Sebagai Administrator, Anda melihat semua aduan Pilkades, termasuk yang mengadukan panitia. Penanganan dilakukan di menu Pengajuan Layanan."}
          </p>
        }
      />
    </div>
  );
}
