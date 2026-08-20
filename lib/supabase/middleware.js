import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

// Halaman yang hanya boleh diakses admin/petugas desa yang sudah login.
// Layanan warga (surat, pengaduan, dll. di fase berikutnya) TIDAK masuk
// daftar ini — warga akses tanpa akun.
const ROUTE_ADMIN = ["/dashboard"];

/**
 * Dipanggil dari middleware.js di root project.
 * Tugasnya: refresh token Supabase supaya sesi login user tidak
 * mendadak habis di tengah pemakaian.
 */
export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const butuhLogin = ROUTE_ADMIN.some((path) => pathname.startsWith(path));

  if (butuhLogin && !user) {
    // Arahkan ke beranda (bukan /login) — login sekarang dalam bentuk
    // popup yang dibuka lewat tombol di beranda, jadi halaman yang tampil
    // saat belum login seharusnya tetap beranda, bukan form penuh.
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (pathname === "/login" && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
