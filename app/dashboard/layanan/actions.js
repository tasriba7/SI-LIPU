"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { pastikanAdmin, pastikanBisaMenulis } from "@/lib/akses";

export async function updateStatusPengajuanLayanan(prevState, formData) {
  const id = formData.get("id");
  const status = formData.get("status");
  const catatan_admin = formData.get("catatan_admin")?.trim() || null;

  if (!id || !status) {
    return { error: "Data tidak lengkap." };
  }
  if (!["diajukan", "diproses", "selesai", "ditolak"].includes(status)) {
    return { error: "Status tidak valid." };
  }
  if (status === "ditolak" && !catatan_admin) {
    return { error: "Isi catatan alasan penolakan agar warga tahu sebabnya." };
  }

  const supabase = await createClient();
  const _akses = await pastikanBisaMenulis(supabase);
  if (_akses.error) return { error: _akses.error };
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("pengajuan_layanan")
    .update({ status, catatan_admin, diproses_oleh: user?.id })
    .eq("id", id);

  if (error) {
    return { error: "Gagal menyimpan perubahan. Coba lagi." };
  }

  revalidatePath("/dashboard/layanan");
  revalidatePath(`/dashboard/layanan/${id}`);

  return { success: true };
}

// ---------------------------------------------------------------------------
// Aksi massal (dipilih lewat kotak centang di daftar pengajuan)
// ---------------------------------------------------------------------------
const BATAS_MASSAL = 200;
const SUDAH_DIPROSES = ["diproses", "selesai", "ditolak"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Id dari klien tidak dipercaya: hanya UUID valid, tanpa duplikat, dibatasi jumlahnya. */
function bersihkanIds(ids) {
  if (!Array.isArray(ids)) return [];
  return [...new Set(ids.map(String).filter((i) => UUID.test(i)))].slice(0, BATAS_MASSAL);
}

function segarkanDaftar() {
  revalidatePath("/dashboard/layanan");
  revalidatePath("/dashboard");
}

/**
 * Reset: kembalikan pengajuan yang sudah diproses (diproses/selesai/ditolak)
 * ke status "diajukan". Catatan untuk warga & penanda petugas dikosongkan.
 * Surat yang sudah terbit TIDAK dihapus (tetap ada di arsip Surat Terbit).
 */
export async function resetPengajuanLayanan(ids) {
  const daftar = bersihkanIds(ids);
  if (daftar.length === 0) return { error: "Pilih minimal satu pengajuan." };

  const supabase = await createClient();
  const akses = await pastikanBisaMenulis(supabase);
  if (akses.error) return { error: akses.error };

  const { data, error } = await supabase
    .from("pengajuan_layanan")
    .update({ status: "diajukan", catatan_admin: null, diproses_oleh: null })
    .in("id", daftar)
    .in("status", SUDAH_DIPROSES)
    .select("id");

  if (error) return { error: "Gagal mereset pengajuan. Coba lagi." };

  segarkanDaftar();
  const jumlah = data?.length ?? 0;
  return { success: true, jumlah, dilewati: daftar.length - jumlah };
}

/**
 * Hapus permanen pengajuan yang BELUM diproses (status "diajukan"). Hanya admin.
 * Yang sudah punya surat terbit dilewati (arsip surat tidak boleh ikut hilang).
 */
export async function hapusPengajuanLayanan(ids) {
  const daftar = bersihkanIds(ids);
  if (daftar.length === 0) return { error: "Pilih minimal satu pengajuan." };

  const supabase = await createClient();
  const akses = await pastikanAdmin(supabase);
  if (akses.error) return { error: akses.error };

  const { data: kandidat, error: errKandidat } = await supabase
    .from("pengajuan_layanan")
    .select("id")
    .in("id", daftar)
    .eq("status", "diajukan");
  if (errKandidat) return { error: "Gagal memeriksa pengajuan. Coba lagi." };

  const idKandidat = (kandidat ?? []).map((r) => r.id);
  if (idKandidat.length === 0) {
    return { error: "Hanya pengajuan berstatus Diajukan yang bisa dihapus. Pilihan Anda sudah diproses." };
  }

  const { data: bersurat } = await supabase
    .from("surat_terbit")
    .select("pengajuan_id")
    .in("pengajuan_id", idKandidat);
  const terkunci = new Set((bersurat ?? []).map((r) => r.pengajuan_id));
  const idHapus = idKandidat.filter((id) => !terkunci.has(id));

  if (idHapus.length === 0) {
    return {
      error:
        "Pengajuan yang dipilih sudah memiliki surat terbit sehingga tidak bisa dihapus. Hapus/ganti arsip suratnya lebih dulu.",
    };
  }

  const { data: terhapus, error } = await supabase
    .from("pengajuan_layanan")
    .delete()
    .in("id", idHapus)
    .eq("status", "diajukan")
    .select("id");

  if (error) {
    if (error.code === "23503") {
      return { error: "Pengajuan masih terhubung ke data lain (mis. surat terbit) sehingga tidak bisa dihapus." };
    }
    return { error: "Gagal menghapus pengajuan. Coba lagi." };
  }
  if (!terhapus || terhapus.length === 0) {
    // RLS menolak diam-diam (0 baris) bila policy DELETE belum ada.
    return {
      error:
        "Penghapusan ditolak database. Pastikan migrasi 0024_hapus_pengajuan_layanan.sql sudah dijalankan di Supabase dan akun Anda Administrator.",
    };
  }

  segarkanDaftar();
  return {
    success: true,
    jumlah: terhapus.length,
    dilewati: daftar.length - terhapus.length,
    bersuratDilewati: terkunci.size,
  };
}
