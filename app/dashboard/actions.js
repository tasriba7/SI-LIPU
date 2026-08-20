"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Server Action untuk logout perangkat desa dari panel admin.
 * Dipanggil dari <form action={logoutAction}> di components/dashboard/DashboardShell.jsx
 * (diteruskan lewat app/dashboard/layout.js). Setelah keluar, arahkan ke beranda
 * publik (bukan /login) supaya admin mendarat di halaman umum warga.
 */
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
