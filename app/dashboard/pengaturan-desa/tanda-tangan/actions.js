"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { pastikanAdmin } from "@/lib/akses";
import { BUCKET_TTD } from "@/lib/suratBerkas";

const EKSTENSI = ["png", "jpg", "jpeg", "webp"];
const MAKS_MB = 2;

const BERKAS = [
  { nama: "ttd_kades", kolom: "ttd_kades_path", label: "tanda tangan Kepala Desa", prefix: "ttd-kades" },
  { nama: "ttd_sekdes", kolom: "ttd_sekdes_path", label: "tanda tangan Sekretaris Desa", prefix: "ttd-sekdes" },
  { nama: "stempel", kolom: "stempel_path", label: "stempel", prefix: "stempel" },
];

/** Unggah / hapus gambar tanda tangan & stempel. Hanya Administrator. */
export async function simpanTandaTangan(prevState, formData) {
  const supabase = await createClient();
  const akses = await pastikanAdmin(supabase);
  if (akses.error) return { error: akses.error };

  const { data: lama } = await supabase
    .from("config_desa")
    .select("ttd_kades_path, ttd_sekdes_path, stempel_path")
    .eq("id", 1)
    .maybeSingle();

  const update = {};
  const hapusPath = [];

  for (const b of BERKAS) {
    const file = formData.get(b.nama);
    const hapus = formData.get(`hapus_${b.nama}`) === "1";

    if (file && typeof file === "object" && file.size > 0) {
      const ekstensi = (file.name?.split(".").pop() || "").toLowerCase();
      if (!EKSTENSI.includes(ekstensi)) return { error: `Format ${b.label} harus PNG, JPG, atau WEBP.` };
      if (file.size > MAKS_MB * 1024 * 1024) return { error: `Ukuran ${b.label} maksimal ${MAKS_MB}MB.` };

      const path = `${b.prefix}-${Date.now()}.${ekstensi}`;
      const { error } = await supabase.storage
        .from(BUCKET_TTD)
        .upload(path, file, { contentType: file.type || undefined });
      if (error) return { error: `Gagal mengunggah ${b.label}: ${error.message}` };

      if (lama?.[b.kolom]) hapusPath.push(lama[b.kolom]);
      update[b.kolom] = path;
    } else if (hapus && lama?.[b.kolom]) {
      hapusPath.push(lama[b.kolom]);
      update[b.kolom] = null;
    }
  }

  if (Object.keys(update).length === 0) return { error: "Tidak ada perubahan." };

  const { error } = await supabase.from("config_desa").update(update).eq("id", 1);
  if (error) return { error: "Gagal menyimpan pengaturan. Pastikan migrasi 0022 sudah dijalankan." };

  // Hapus berkas lama setelah database berhasil diperbarui (kalau gagal, tidak fatal).
  if (hapusPath.length) await supabase.storage.from(BUCKET_TTD).remove(hapusPath);

  revalidatePath("/dashboard/pengaturan-desa/tanda-tangan");
  return { success: true };
}
