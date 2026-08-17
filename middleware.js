import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Jalankan middleware di semua route KECUALI:
     * - file statis Next.js (_next/static, _next/image)
     * - favicon.ico
     * - file gambar umum
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
