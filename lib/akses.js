import { redirect } from "next/navigation";
import {
  bisaMenulis,
  bisaTerbitkanSurat,
  isAdminRole,
  isKantorDesaRole,
} from "@/lib/roles";

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

/**
 * Perangkat kantor desa yang boleh MENGUBAH data se-desa (jenis layanan,
 * galeri): admin, sekretaris desa, kaur, kasi. Kepala Desa hanya melihat dan
 * Kadus/Ketua RT hanya mengurus wilayahnya, jadi keduanya ditolak.
 */
export async function pastikanKantorDesaBisaMenulis(supabase) {
  const r = await pastikanBisaMenulis(supabase);
  if (r.error) return r;
  if (!isKantorDesaRole(r.role)) {
    return {
      error:
        "Fitur ini hanya untuk perangkat kantor desa. Kadus dan Ketua RT mengelola data warga di wilayahnya saja.",
    };
  }
  return r;
}

/**
 * Penjaga HALAMAN untuk menu se-desa (jenis layanan, galeri, surat terbit,
 * modul surat lama): Kepala Desa boleh melihat, Kadus/Ketua RT dialihkan ke
 * beranda dashboard. Dipanggil dari layout.js tiap folder menu tersebut.
 */
export async function jagaHalamanKantorDesa(supabase) {
  const r = await ambilRole(supabase);
  if (r.error) redirect("/login");
  if (!isKantorDesaRole(r.role)) redirect("/dashboard");
  return r;
}

/** Admin, Sekretaris Desa, Kaur, Kasi (ROLE_PENERBIT_SURAT). */
export async function pastikanBisaTerbitkanSurat(supabase) {
  const r = await ambilRole(supabase);
  if (r.error) return r;
  if (!bisaTerbitkanSurat(r.role)) {
    return {
      error:
        "Penerbitan surat hanya bisa dilakukan oleh Administrator, Sekretaris Desa, Kaur, atau Kasi.",
    };
  }
  return { ok: true, user: r.user, role: r.role };
}
