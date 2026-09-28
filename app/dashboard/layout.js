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

  return (
    <DashboardShell
      jumlahPendaftaran={jumlahPendaftaran ?? 0}
      profile={profile ?? { nama: user.email, role: "kasi" }}
      logoutAction={logout}
    >
      {children}
    </DashboardShell>
  );
}
