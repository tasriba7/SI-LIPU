import { bisaMenulis, isAdminRole } from "@/lib/roles";

/**
 * Pengecekan role di SERVER untuk server action. Jangan hanya mengandalkan
 * sidebar yang menyembunyikan menu: server action bisa dipanggil langsung.
 * (Lapisan kedua ada di RLS database, lihat migrasi 0017.)
 *
 * Semua fungsi mengembalikan { error } kalau ditolak, atau { ok, user, role }.
 */
async function ambilRole(supabase) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Anda harus login." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return { user, role: profile?.role ?? null };
}

/** Hanya role "admin". */
export async function pastikanAdmin(supabase) {
  const r = await ambilRole(supabase);
  if (r.error) return r;
  if (!isAdminRole(r.role)) {
    return { error: "Fitur ini hanya bisa dilakukan oleh Administrator." };
  }
  return { ok: true, user: r.user, role: r.role };
}

/** Semua role kecuali Kepala Desa (yang hanya boleh melihat). */
export async function pastikanBisaMenulis(supabase) {
  const r = await ambilRole(supabase);
  if (r.error) return r;
  if (!bisaMenulis(r.role)) {
    return {
      error:
        "Akun Kepala Desa hanya bisa melihat data. Perubahan dilakukan oleh Administrator atau perangkat desa terkait.",
    };
  }
  return { ok: true, user: r.user, role: r.role };
}
