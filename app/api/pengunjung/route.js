import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/pengunjung — mencatat satu kunjungan beranda.
 *
 * Satu browser dihitung maksimal sekali per hari (WITA). Cookie
 * `si_lipu_kunjungan` hanya berisi TANGGAL terakhir dihitung (mis.
 * 2026-10-11) — bukan ID, jadi tidak bisa dipakai melacak orang. Yang
 * tersimpan di database hanya angka harian (lihat migrasi 0044).
 */
const NAMA_COOKIE = "si_lipu_kunjungan";
const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;
// Mesin pencari, pratinjau tautan, pemantau uptime, dan peramban tanpa kepala.
const POLA_BOT =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python-requests|httpclient|axios|node-fetch|go-http/i;

const tanpaCache = { "Cache-Control": "no-store" };

export async function POST(request) {
  // Hanya dari halaman situs ini sendiri (bukan situs lain / skrip luar).
  const origin = request.headers.get("origin");
  if (origin) {
    let hostAsal = "";
    try {
      hostAsal = new URL(origin).host;
    } catch {
      /* origin tidak valid -> ditolak di bawah */
    }
    if (!hostAsal || hostAsal !== request.headers.get("host")) {
      return NextResponse.json({ ok: false }, { status: 403, headers: tanpaCache });
    }
  }

  const ua = request.headers.get("user-agent") || "";
  if (!ua || POLA_BOT.test(ua)) {
    return NextResponse.json({ ok: true, dihitung: false }, { headers: tanpaCache });
  }

  const dariCookie = request.cookies.get(NAMA_COOKIE)?.value;
  const terakhir = dariCookie && POLA_TANGGAL.test(dariCookie) ? dariCookie : null;

  let hasil;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .rpc("catat_kunjungan", { p_terakhir: terakhir })
      .single();
    if (error || !data) throw error || new Error("tanpa data");
    hasil = data;
  } catch (e) {
    console.error("[pengunjung] gagal mencatat:", e?.message || e);
    return NextResponse.json({ ok: false }, { status: 503, headers: tanpaCache });
  }

  const res = NextResponse.json(
    {
      ok: true,
      dihitung: Boolean(hasil.r_dihitung),
      total: Number(hasil.r_total) || 0,
      hariIni: Number(hasil.r_hari_ini) || 0,
    },
    { headers: tanpaCache }
  );
  // Tanggal dinormalkan ke "YYYY-MM-DD" apa pun bentuk yang dikembalikan
  // klien database (teks atau objek Date). Kalau bentuknya tak dikenali,
  // lebih baik tidak memasang cookie daripada memasang nilai yang nanti
  // ditolak pemeriksaan di atas (yang membuat tiap refresh dihitung ulang).
  const tanggal =
    typeof hasil.r_tanggal === "string"
      ? hasil.r_tanggal.slice(0, 10)
      : hasil.r_tanggal instanceof Date
        ? hasil.r_tanggal.toISOString().slice(0, 10)
        : null;
  if (hasil.r_dihitung && tanggal && POLA_TANGGAL.test(tanggal)) {
    res.cookies.set(NAMA_COOKIE, tanggal, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 48,
    });
  }
  return res;
}
