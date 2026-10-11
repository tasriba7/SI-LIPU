import PantauLayanan from "@/components/dashboard/PantauLayanan";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isBpdRole } from "@/lib/roles";
import { ambilRole } from "@/lib/akses";

// Pemantauan pengaduan warga + proses penanganannya (Anggota BPD, hanya lihat).
export default async function PengaduanPage({ searchParams }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const r = await ambilRole(supabase);
  if (r.error) redirect("/login");
  if (!isBpdRole(r.role)) redirect("/dashboard/layanan?status=semua");

  return (
    <PantauLayanan
      sp={sp}
      basePath="/dashboard/pengaduan"
      kategori="pengaduan"
      judul="Pengaduan Warga"
      deskripsi="Aduan dari warga dan bagaimana desa menanganinya. Klik kode untuk melihat alur penanganan."
    />
  );
}
