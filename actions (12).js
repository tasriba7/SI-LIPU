"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Server Action untuk login ADMIN/PETUGAS DESA.
 * Tidak ada pendaftaran publik — akun dibuat manual oleh superadmin lewat
 * Supabase Dashboard (lihat supabase/migrations/0001_init_profiles.sql).
 * Dipanggil dari <form action={login}> di app/login/page.js.
 */
export async function login(prevState, formData) {
  const email = formData.get("email");
  const password = formData.get("password");

  if (!email || !password) {
    return { error: "Email dan kata sandi wajib diisi." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "Email atau kata sandi salah. Coba lagi." };
  }

  redirect("/dashboard");
}
