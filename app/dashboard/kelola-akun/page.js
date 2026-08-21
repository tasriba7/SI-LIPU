import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminRole } from "@/lib/roles";
import PilihMassal from "./PilihMassal";

async function ambilSemuaAuthUsers(adminClient) {
  // auth.admin.listUsers dipaginasi; ambil semua halaman (staf desa jumlahnya
  // kecil, jadi cukup aman looping sampai habis).
  const semua = [];
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error || !data?.users?.length) break;
    semua.push(...data.users);
    if (data.users.length < perPage) break;
    page += 1;
  }
  return semua;
}

export default async function KelolaAkunPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profileSaya } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id)
    .single();

  if (!isAdminRole(profileSaya?.role)) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-lg font-bold text-amber-800">Halaman Terbatas</h1>
        <p className="mt-2 text-sm text-amber-700">
          Halaman ini hanya bisa diakses oleh Kepala Desa atau Sekretaris
          Desa, karena berkaitan dengan password login perangkat desa lain.
          Hubungi Kepala Desa/Sekretaris Desa kalau Anda perlu bantuan
          mengatur ulang akun.
        </p>
      </div>
    );
  }

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, nama, role, jabatan, dusun, created_at")
    .order("role")
    .order("nama");

  let daftar = [];
  let errAuth = null;
  try {
    const adminClient = createAdminClient();
    const authUsers = await ambilSemuaAuthUsers(adminClient);
    const emailById = new Map(authUsers.map((u) => [u.id, u.email]));
    daftar = (profiles ?? []).map((p) => ({
      ...p,
      email: emailById.get(p.id) || "-",
    }));
  } catch (e) {
    errAuth = e.message;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-slate-800">Kelola Akun Staf</h1>
        <p className="text-sm text-slate-500">
          Atur ulang password akun perangkat desa yang sudah aktif, kapan
          saja — tidak perlu menunggu proses pendaftaran ulang. Bisa satu per
          satu (manual atau acak) atau pilih banyak sekaligus (acak semua).
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          Gagal memuat daftar profil: {error.message}
        </p>
      )}
      {errAuth && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          Gagal memuat data email akun: {errAuth}
        </p>
      )}

      <PilihMassal daftar={daftar} />
    </div>
  );
}
