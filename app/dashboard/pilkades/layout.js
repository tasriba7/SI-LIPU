import { createClient } from "@/lib/supabase/server";
import { jagaHalamanPilkades } from "@/lib/akses";

// Modul Pilkades: hanya Administrator dan Panitia Pilkades.
export default async function PilkadesLayout({ children }) {
  const supabase = await createClient();
  await jagaHalamanPilkades(supabase);
  return children;
}
