import { createClient } from "@/lib/supabase/server";
import { jagaHalamanKantorDesa } from "@/lib/akses";

// Arsip surat memuat data pribadi warga se-desa: Kadus & Ketua RT dialihkan
// ke beranda dashboard.
export default async function SuratTerbitLayout({ children }) {
  const supabase = await createClient();
  await jagaHalamanKantorDesa(supabase);
  return children;
}
