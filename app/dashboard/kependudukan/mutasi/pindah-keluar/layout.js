import { createClient } from "@/lib/supabase/server";
import { jagaHalamanPenerbitSurat } from "@/lib/akses";

// Hanya Admin/Sekdes/Kaur/Kasi (sama dengan aksi server mutasi); role lain
// dialihkan ke beranda dashboard. Server action tetap memeriksa ulang.
export default async function MutasiPindahKeluarLayout({ children }) {
  const supabase = await createClient();
  await jagaHalamanPenerbitSurat(supabase);
  return children;
}
