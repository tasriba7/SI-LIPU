"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Server Action untuk login ADMIN/PETUGAS DESA dan PANITIA PILKADES.
 * Satu sistem login yang sama; tujuan setelah login ditentukan oleh ROLE di
 * database (bukan tombol/pintu yang diklik). Field "via" hanya mengubah
 * tampilan popup.
 */
export async function login(prevState, formData) {
  const email = formData.get("email");
  const password = formData.get("password");

  if (!email || !password) {
    return { error: "Email dan kata sandi wajib diisi." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "Email atau kata sandi salah. Coba lagi." };
  }

  const { data: profil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  redirect(
    profil?.role === "panitia_pilkades" ? "/dashboard/pilkades" : "/dashboard"
  );
}
