"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { pastikanAdmin } from "@/lib/akses";
import { buatToken, hashToken } from "@/lib/tautanData";
import { SEKSI_IDS, PILIHAN_HARI, HARI_DEFAULT } from "@/lib/tautanDataSeksi";

async function alamatSitus() {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function buatTautanData(prevState, formData) {
  const supabase = await createClient();
  const akses = await pastikanAdmin(supabase);
  if (akses.error) return { error: akses.error };

  const instansi = formData.get("instansi")?.toString().trim() ?? "";
  const keperluan = formData.get("keperluan")?.toString().trim() ?? "";
  const seksi = [...new Set(formData.getAll("seksi").map(String))].filter((s) =>
    SEKSI_IDS.includes(s)
  );
  const hariMentah = Number(formData.get("hari"));
  const hari = PILIHAN_HARI.includes(hariMentah) ? hariMentah : HARI_DEFAULT;

  if (!instansi) return { error: "Isi dulu nama instansi/lembaga yang meminta data." };
  if (instansi.length > 120) return { error: "Nama instansi terlalu panjang (maksimal 120 huruf)." };
  if (keperluan.length > 300) return { error: "Keperluan terlalu panjang (maksimal 300 huruf)." };
  if (seksi.length === 0) return { error: "Centang minimal satu isi data yang akan dibagikan." };

  const { data: profil } = await supabase
    .from("profiles")
    .select("nama")
    .eq("id", akses.user.id)
    .single();

  const token = buatToken();
  const kedaluwarsa = new Date(Date.now() + hari * 24 * 60 * 60 * 1000);

  const { error } = await supabase.from("tautan_data").insert({
    token_hash: hashToken(token),
    instansi,
    keperluan: keperluan || null,
    seksi,
    dibuat_oleh: akses.user.id,
    dibuat_oleh_nama: profil?.nama ?? null,
    kedaluwarsa_pada: kedaluwarsa.toISOString(),
  });

  if (error) {
    return {
      error:
        "Tautan gagal dibuat. Pastikan migrasi 0024_tautan_data_sekali_pakai.sql sudah dijalankan di Supabase.",
    };
  }

  revalidatePath("/dashboard/pengaturan-desa/bagikan-data");

  // Tautan HANYA ditampilkan sekali di sini. Yang tersimpan di database
  // cuma hash-nya, jadi tautan tidak bisa ditampilkan ulang.
  return {
    ok: true,
    tautan: `${await alamatSitus()}/data-bersama/${token}`,
    instansi,
    kedaluwarsa: kedaluwarsa.toISOString(),
  };
}

export async function batalkanTautanData(prevState, formData) {
  const supabase = await createClient();
  const akses = await pastikanAdmin(supabase);
  if (akses.error) return { error: akses.error };

  const id = formData.get("id")?.toString();
  if (!id) return { error: "Tautan tidak ditemukan." };

  const { data, error } = await supabase
    .from("tautan_data")
    .update({ status: "dibatalkan" })
    .eq("id", id)
    .eq("status", "aktif")
    .select("id");

  if (error) return { error: "Gagal membatalkan tautan." };
  if (!data?.length) return { error: "Tautan ini sudah dibuka atau sudah dibatalkan." };

  revalidatePath("/dashboard/pengaturan-desa/bagikan-data");
  return { ok: true };
}
