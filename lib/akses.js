import { redirect } from "next/navigation";
import {
  bisaMenulis,
  bisaTerbitkanSurat,
  isAdminRole,
  isKantorDesaRole,
  bisaKelolaPilkades,
} from "@/lib/roles";

/**
 * Pengecekan role di SERVER untuk server action. Jangan hanya mengandalkan
 * sidebar yang menyembunyikan menu: server action bisa dipanggil langsung.
 * (Lapisan kedua ada di RLS database, lihat migrasi 0017.)
 *
 * Semua fungsi mengembalikan { error } kalau ditolak, atau { ok, user, role }.
 */
export async function ambilRole(supabase) {
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

/** Semua role kecuali yang hanya boleh melihat (Kepala Desa, Anggota BPD). */
export async function pastikanBisaMenulis(supabase) {
  const r = await ambilRole(supabase);
  if (r.error) return r;
  if (!bisaMenulis(r.role)) {
    return {
      error:
        "Akun ini hanya bisa melihat data (Kepala Desa / Anggota BPD). Perubahan dilakukan oleh Administrator atau perangkat desa terkait.",
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

/**
 * Penjaga HALAMAN untuk menu yang HANYA untuk Administrator (jenis layanan,
 * galeri, berita, APBDes, wisata, arsip surat terbit, modul surat lama).
 * Role lain dialihkan ke beranda dashboard. Dipanggil dari layout.js tiap
 * folder menu tersebut. Server action memakai pastikanAdmin().
 */
export async function jagaHalamanAdmin(supabase) {
  const r = await ambilRole(supabase);
  if (r.error) redirect("/login");
  if (!isAdminRole(r.role)) redirect("/dashboard");
  return r;
}

/**
 * Penjaga HALAMAN untuk form tambah/ubah data (mis. Tambah Warga): role
 * hanya-lihat (Kepala Desa, Anggota BPD) dialihkan ke beranda dashboard.
 * Server action tetap memeriksa ulang lewat pastikanBisaMenulis.
 */
export async function jagaHalamanTulis(supabase) {
  const r = await ambilRole(supabase);
  if (r.error) redirect("/login");
  if (!bisaMenulis(r.role)) redirect("/dashboard");
  return r;
}

/**
 * Penjaga HALAMAN untuk form yang aksinya dibatasi ke ROLE_PENERBIT_SURAT
 * (mis. catat mutasi penduduk). Kadus/Ketua RT, Kepala Desa, BPD dialihkan.
 */
export async function jagaHalamanPenerbitSurat(supabase) {
  const r = await ambilRole(supabase);
  if (r.error) redirect("/login");
  if (!bisaTerbitkanSurat(r.role)) redirect("/dashboard");
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

/** Admin atau Panitia Pilkades (server action modul Pilkades). */
export async function pastikanKelolaPilkades(supabase) {
  const r = await ambilRole(supabase);
  if (r.error) return r;
  if (!bisaKelolaPilkades(r.role)) {
    return { error: "Fitur ini hanya untuk Administrator dan Panitia Pilkades." };
  }
  return { ok: true, user: r.user, role: r.role };
}

/** Penjaga HALAMAN modul Pilkades: role lain dialihkan ke beranda dashboard. */
export async function jagaHalamanPilkades(supabase) {
  const r = await ambilRole(supabase);
  if (r.error) redirect("/login");
  if (!bisaKelolaPilkades(r.role)) redirect("/dashboard");
  return r;
}
