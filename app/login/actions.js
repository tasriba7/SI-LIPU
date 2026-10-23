"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Server Action login. Satu sistem akun (Supabase Auth + profiles), tetapi
 * dua pintu yang KETAT menurut role di database:
 *  - pintu "panitia": hanya akun role panitia_pilkades yang boleh masuk.
 *  - pintu "desa"   : akun panitia_pilkades ditolak (harus lewat pintu panitia).
 * Tanpa field "pintu" (mis. halaman /login lama): masuk sesuai role.
 * Penolakan dilakukan SETELAH password benar lalu sesi langsung ditutup.
 */
export async function login(prevState, formData) {
  const email = formData.get("email");
  const password = formData.get("password");
  const pintu = formData.get("pintu"); // "panitia" | "desa" | null

  if (!email || !password) {
    return { error: "Email dan kata sandi wajib diisi.", pintu };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      pintu,
      error:
        pintu === "panitia"
          ? "Email atau kata sandi salah, atau akun Panitia Pilkades belum dibuat. Akun panitia dibuat oleh Administrator desa."
          : "Email atau kata sandi salah. Coba lagi.",
    };
  }

  const { data: profil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();
  const role = profil?.role ?? null;
  const adalahPanitia = role === "panitia_pilkades";

  if (pintu === "panitia" && !adalahPanitia) {
    await supabase.auth.signOut();
    return {
      pintu,
      error:
        "Akun ini bukan akun Panitia Pilkades. Gunakan tab \"Perangkat Desa\" untuk akun admin/perangkat desa, atau minta Administrator membuatkan akun panitia.",
    };
  }
  if (pintu === "desa" && adalahPanitia) {
    await supabase.auth.signOut();
    return {
      pintu,
      error:
        "Ini akun Panitia Pilkades. Silakan masuk lewat tab \"Panitia Pilkades\".",
    };
  }

  redirect(adalahPanitia ? "/dashboard/pilkades" : "/dashboard");
}
