import { createClient } from "@/lib/supabase/server";
import { jagaHalamanAdmin } from "@/lib/akses";

// Menu khusus Administrator: role lain dialihkan ke beranda dashboard.
export default async function ApbdesLayout({ children }) {
  const supabase = await createClient();
  await jagaHalamanAdmin(supabase);
  return children;
}
