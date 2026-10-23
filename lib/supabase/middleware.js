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
// Teruskan path ke Server Component lewat header x-pathname (dipakai layout
// dashboard untuk membatasi Panitia Pilkades hanya ke /dashboard/pilkades).
function lanjutkan(request, pathname) {
  const headers = new Headers(request.headers);
  headers.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers } });
}

export async function updateSession(request) {
  const { pathname } = request.nextUrl;
  const butuhLogin = ROUTE_ADMIN.some((path) => pathname.startsWith(path));

  // JALUR CEPAT: pengunjung tanpa cookie sesi Supabase pasti belum login, jadi
  // tidak ada token yang perlu di-refresh dan tidak perlu bertanya ke server
  // Auth Supabase. Tanpa ini, SETIAP perpindahan halaman (termasuk halaman
  // publik untuk warga) menunggu satu panggilan jaringan ke Supabase dulu.
  // Nama cookie sesi: sb-<ref>-auth-token (bisa terpecah .0, .1, ...).
  const adaCookieSesi = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));

  if (!adaCookieSesi) {
    if (butuhLogin) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    // /login tanpa sesi tetap dibuka seperti biasa.
    return NextResponse.next({ request });
  }

  let supabaseResponse = lanjutkan(request, pathname);

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
          supabaseResponse = lanjutkan(request, pathname);
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
