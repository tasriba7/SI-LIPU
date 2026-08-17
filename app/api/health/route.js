import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/health
 * Endpoint sederhana untuk memastikan environment variable Supabase
 * sudah terbaca dengan benar dan koneksi berhasil, baik di lokal
 * maupun setelah deploy ke Vercel.
 */
export async function GET() {
  const missing = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

  if (missing.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        message: "Environment variable belum lengkap.",
        missing,
      },
      { status: 500 }
    );
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.getSession();

    if (error) {
      return NextResponse.json(
        { ok: false, message: "Gagal konek ke Supabase.", error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Koneksi Supabase berhasil.",
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: "Terjadi error tak terduga.", error: String(err) },
      { status: 500 }
    );
  }
}
