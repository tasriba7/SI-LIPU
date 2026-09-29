import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { logout } from "./actions";

export default async function DashboardLayout({ children }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("nama, role, jabatan, dusun")
    .eq("id", user.id)
    .single();

  // Jumlah pendaftaran akun yang menunggu -> badge notifikasi di sidebar.
  const { count: jumlahPendaftaran } = await supabase
    .from("pendaftaran_akun")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  // Jumlah data warga yang belum lengkap (mengikuti RLS: Kadus/Ketua RT hanya
  // menghitung wilayahnya sendiri, staf desa menghitung semua wilayah) ->
  // badge notifikasi "data belum lengkap" di sidebar.
  const { count: jumlahDataKurang } = await supabase
    .from("warga_kelengkapan")
    .select("id", { count: "exact", head: true })
    .gt("jumlah_kosong", 0);

  return (
    <DashboardShell
      jumlahPendaftaran={jumlahPendaftaran ?? 0}
      jumlahDataKurang={jumlahDataKurang ?? 0}
      profile={profile ?? { nama: user.email, role: "kasi" }}
      logoutAction={logout}
    >
      {children}
    </DashboardShell>
  );
}
