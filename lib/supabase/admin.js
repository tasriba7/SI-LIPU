import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase dengan SUPABASE_SECRET_KEY — punya akses penuh, melewati
 * RLS, dan bisa panggil Admin API (mis. auth.admin.createUser).
 *
 * ATURAN WAJIB (lihat README.md & SECURITY.md):
 *  - HANYA dipakai di kode yang jalan di server (Server Action/Route Handler)
 *  - JANGAN PERNAH diimpor dari Client Component ("use client")
 *  - JANGAN PERNAH expose hasil client ini langsung ke browser tanpa disaring
 */
export function createAdminClient() {
  if (!process.env.SUPABASE_SECRET_KEY) {
    throw new Error(
      "SUPABASE_SECRET_KEY belum diset di environment variable — wajib ada untuk fitur admin (approve pendaftaran staf)."
    );
  }
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
