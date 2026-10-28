import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ambilRole } from "@/lib/akses";
import { isAdminRole } from "@/lib/roles";

// Administrator biasanya membuka Periode; Panitia membuka Jadwal Tahapan (tab pertama).
export default async function PengaturanPanitia() {
  const supabase = await createClient();
  const { role } = await ambilRole(supabase);
  redirect(isAdminRole(role) ? "/dashboard/pilkades/pengaturan/periode" : "/dashboard/pilkades/pengaturan/jadwal");
}
