import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client untuk dipakai di sisi browser (Client Component).
 * Wajib ada 2 environment variable ini (lihat README.md / .env.example):
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (key baru, prefix sb_publishable_)
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}
