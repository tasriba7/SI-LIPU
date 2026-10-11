import { createClient } from "@/lib/supabase/server";
import { jagaHalamanTulis } from "@/lib/akses";

// Form ubah data: role hanya-lihat (Kepala Desa, Anggota BPD) dialihkan ke
// beranda dashboard. Server action tetap memeriksa ulang.
export default async function MutasiPindahKeluarLayout({ children }) {
  const supabase = await createClient();
  await jagaHalamanTulis(supabase);
  return children;
}
