import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { ambilPemberitahuanLayanan } from "@/lib/pemberitahuanLayanan";
import { bisaKelolaPilkades } from "@/lib/roles";
import { ambilPeriode } from "@/lib/pilkades";
import { ambilKunciPilkades } from "@/lib/pilkadesKunci";
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

  // Panitia Pilkades hanya boleh berada di /dashboard/pilkades. Halaman lain
  // dialihkan (lapisan kedua; lapisan utama tetap RLS database).
  if (profile?.role === "panitia_pilkades") {
    const path = (await headers()).get("x-pathname");
    if (path && !path.startsWith("/dashboard/pilkades")) {
      redirect("/dashboard/pilkades");
    }
  }

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
    .eq("status_kependudukan", "aktif")
    .gt("jumlah_kosong", 0);

  // Pengajuan layanan baru -> badge di menu "Pengajuan Layanan". Hanya terisi
  // untuk Kepala Desa & Ketua RT (role lain selalu 0; mereka tidak menerima
  // pemberitahuan ini). Ketua RT hanya dihitung untuk wilayahnya.
  const pemberitahuanLayanan = await ambilPemberitahuanLayanan(supabase, profile?.role, {
    tampil: 0,
  });

  // Tahap Pilkades yang masih terkunci -> ikon gembok di menu samping.
  let kunciPilkades = {};
  if (bisaKelolaPilkades(profile?.role)) {
    kunciPilkades = await ambilKunciPilkades(supabase, await ambilPeriode(supabase));
  }

  return (
    <DashboardShell
      kunciPilkades={kunciPilkades}
      jumlahPendaftaran={jumlahPendaftaran ?? 0}
      jumlahDataKurang={
        profile?.role === "bpd" || profile?.role === "kepala_desa" ? 0 : (jumlahDataKurang ?? 0)
      }
      jumlahPengajuanBaru={pemberitahuanLayanan.total}
      profile={profile ?? { nama: user.email, role: null }}
      logoutAction={logout}
    >
      {children}
    </DashboardShell>
  );
}
