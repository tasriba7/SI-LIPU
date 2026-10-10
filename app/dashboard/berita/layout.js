import { createClient } from "@/lib/supabase/server";
import { jagaHalamanKantorDesa } from "@/lib/akses";

// Menu se-desa: Kadus & Ketua RT dialihkan ke beranda dashboard.
export default async function BeritaLayout({ children }) {
  const supabase = await createClient();
  await jagaHalamanKantorDesa(supabase);
  return children;
}
