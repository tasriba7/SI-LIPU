import { createHmac, timingSafeEqual } from "node:crypto";

// "Bukti verifikasi" untuk pengaduan: dibuat server setelah NIK + tanggal
// lahir cocok, lalu wajib dikirim ulang saat submit. Tujuannya mencegah
// pengiriman aduan tanpa verifikasi (mis. memanggil server action langsung).
//
// PENTING: token SENGAJA tidak memuat identitas apa pun (hanya waktu
// kedaluwarsa + tanda tangan), supaya pengaduan anonim tetap tidak bisa
// ditautkan ke warga. Hanya server yang bisa membuatnya (kunci rahasia
// server, tidak pernah dikirim ke browser).
const MASA_BERLAKU_MENIT = 30;

function kunci() {
  return process.env.SUPABASE_SECRET_KEY || null;
}

function tandatangani(exp, k) {
  return createHmac("sha256", k).update(`bukti-pengaduan:${exp}`).digest("base64url");
}

export function buatBuktiVerifikasi() {
  const k = kunci();
  if (!k) return null;
  const exp = Date.now() + MASA_BERLAKU_MENIT * 60 * 1000;
  return `${exp}.${tandatangani(exp, k)}`;
}

export function cekBuktiVerifikasi(token) {
  const k = kunci();
  if (!k || typeof token !== "string") return false;
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!exp || !sig || exp < Date.now()) return false;
  const benar = Buffer.from(tandatangani(exp, k));
  const dicek = Buffer.from(sig);
  return benar.length === dicek.length && timingSafeEqual(benar, dicek);
}
