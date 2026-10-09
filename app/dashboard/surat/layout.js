import { createClient } from "@/lib/supabase/server";
import { jagaHalamanKantorDesa } from "@/lib/akses";

// Modul pengajuan surat versi lama (se-desa): Kadus & Ketua RT dialihkan ke
// beranda dashboard.
export default async function SuratLamaLayout({ children }) {
  const supabase = await createClient();
  await jagaHalamanKantorDesa(supabase);
  return children;
}
