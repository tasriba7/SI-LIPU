import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

/**
 * Dipanggil dari middleware.js di root project.
 * Tugasnya: refresh token Supabase supaya sesi login user tidak
 * mendadak habis di tengah pemakaian.
 */
export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Wajib dipanggil, jangan dihapus — ini yang bikin sesi ter-refresh.
  await supabase.auth.getUser();

  return supabaseResponse;
}
