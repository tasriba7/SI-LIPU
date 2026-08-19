import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client untuk dipakai di sisi server (Server Component,
 * Server Action, Route Handler). Menggunakan cookie Next.js supaya
 * sesi login tetap tersinkron antara server & browser.
 *
 * Env var yang wajib ada di server (lihat README.md / .env.example):
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (key baru, prefix sb_publishable_)
 *   - SUPABASE_SECRET_KEY (key baru, prefix sb_secret_ — hanya dipakai di
 *     server, JANGAN pernah diekspos ke browser / NEXT_PUBLIC_*)
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll dipanggil dari Server Component (bukan Server Action
            // atau Route Handler) — boleh diabaikan kalau ada middleware
            // yang me-refresh sesi user.
          }
        },
      },
    }
  );
}
