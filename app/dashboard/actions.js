"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // Setelah keluar, arahkan ke beranda publik (bukan /login) — login
  // sekarang berupa popup yang dibuka dari tombol di beranda, jadi
  // beranda-lah yang seharusnya tampil, sesuai alur popup login.
  redirect("/");
}
