import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Dua jenis bukti yang diterbitkan SERVER setelah NIK + tanggal lahir cocok:
//
// 1) Bukti PENGADUAN  (`v2.<exp>.<nonce>.<tanda tangan>`)
//    - TIDAK memuat identitas apa pun, supaya pengaduan anonim tidak bisa
//      ditautkan ke warga.
//    - SEKALI PAKAI: nonce dicatat di tabel `bukti_verifikasi_terpakai`
//      (hanya nonce + waktu, tanpa identitas). Satu verifikasi = satu aduan.
//
// 2) Bukti WARGA  (`<exp>.<tanda tangan>`)
//    - Mengikat warga_id + NIK yang baru saja diverifikasi. Server hanya mau
//      menautkan pengajuan ke warga_id kalau bukti ini cocok. Bukti ini TIDAK
//      boleh dikirim untuk pengaduan anonim (form sudah menjaganya).
//
// Kunci HMAC diturunkan dari BUKTI_VERIFIKASI_SECRET (opsional) atau
// SUPABASE_SECRET_KEY, tidak memakai Secret Key apa adanya.
const MASA_BERLAKU_MENIT = 30;
const VERSI = "v2";

function kunci() {
  const dasar = process.env.BUKTI_VERIFIKASI_SECRET || process.env.SUPABASE_SECRET_KEY;
  if (!dasar) return null;
  return createHmac("sha256", dasar).update("si-lipu:bukti-verifikasi:v2").digest();
}

function tandatangani(data, k) {
  return createHmac("sha256", k).update(data).digest("base64url");
}

function samaAman(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

/* ---------------------------- bukti pengaduan ---------------------------- */

export function buatBuktiVerifikasi() {
  const k = kunci();
  if (!k) return null;
  const exp = String(Date.now() + MASA_BERLAKU_MENIT * 60 * 1000);
  const nonce = randomBytes(16).toString("base64url"); // 22 karakter
  return `${VERSI}.${exp}.${nonce}.${tandatangani(`bukti-pengaduan:${exp}:${nonce}`, k)}`;
}

/** Kembalikan { exp, nonce } kalau tanda tangan benar & belum kedaluwarsa, selain itu null. */
export function bacaBuktiVerifikasi(token) {
  const k = kunci();
  if (!k || typeof token !== "string" || token.length > 200) return null;
  const [versi, expStr, nonce, sig] = token.split(".");
  const exp = Number(expStr);
  if (versi !== VERSI || !nonce || !sig) return null;
  if (!Number.isFinite(exp) || exp < Date.now()) return null;
  if (!/^[A-Za-z0-9_-]{22}$/.test(nonce)) return null;
  if (!samaAman(tandatangani(`bukti-pengaduan:${expStr}:${nonce}`, k), sig)) return null;
  return { exp, nonce };
}

/**
 * Tandai bukti terpakai (ATOMIK: primary key nonce menolak pemakaian kedua).
 * `admin` = client Supabase service role.
 * Return: { ok: true } | { ok: false, terpakai: true } | { ok: false, error }
 */
export async function pakaiBuktiVerifikasi(admin, { exp, nonce }) {
  const { error } = await admin
    .from("bukti_verifikasi_terpakai")
    .insert({ nonce, kedaluwarsa_pada: new Date(exp).toISOString() });

  if (!error) {
    // Bersihkan sisa lama (best effort, tidak memengaruhi hasil).
    await admin
      .from("bukti_verifikasi_terpakai")
      .delete()
      .lt("kedaluwarsa_pada", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    return { ok: true };
  }
  if (error.code === "23505") return { ok: false, terpakai: true };
  return { ok: false, error };
}

/** Kembalikan jatah bukti kalau pengiriman gagal karena masalah server (bukan salah warga). */
export async function lepasBuktiVerifikasi(admin, nonce) {
  await admin.from("bukti_verifikasi_terpakai").delete().eq("nonce", nonce);
}

/* ------------------------------ bukti warga ------------------------------ */

export function buatBuktiWarga(wargaId, nik) {
  const k = kunci();
  if (!k || !wargaId || !nik) return null;
  const exp = String(Date.now() + MASA_BERLAKU_MENIT * 60 * 1000);
  return `${exp}.${tandatangani(`bukti-warga:${exp}:${wargaId}:${nik}`, k)}`;
}

export function cekBuktiWarga(token, wargaId, nik) {
  const k = kunci();
  if (!k || typeof token !== "string" || token.length > 200 || !wargaId || !nik) return false;
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || !sig || exp < Date.now()) return false;
  return samaAman(tandatangani(`bukti-warga:${expStr}:${wargaId}:${nik}`, k), sig);
}

/* ---------------------------- tiket konfirmasi ---------------------------- */
// Diterbitkan bersama pratinjau TERSAMAR ("Apakah ini Anda?"). Hanya dengan
// tiket ini server mau mengirim data lengkap (docs/SECURITY.md poin 1.4).
// Mengikat warga_id + NIK, masa berlaku pendek, dan memakai label tanda
// tangan sendiri sehingga tidak bisa dipakai sebagai bukti warga/pengaduan.

const MASA_TIKET_MENIT = 10;

export function buatTiketKonfirmasi(wargaId, nik) {
  const k = kunci();
  if (!k || !wargaId || !nik) return null;
  const exp = String(Date.now() + MASA_TIKET_MENIT * 60 * 1000);
  return `${exp}.${wargaId}.${tandatangani(`tiket-konfirmasi:${exp}:${wargaId}:${nik}`, k)}`;
}

/** Kembalikan warga_id kalau tiket sah untuk NIK ini & belum kedaluwarsa, selain itu null. */
export function bacaTiketKonfirmasi(token, nik) {
  const k = kunci();
  if (!k || typeof token !== "string" || token.length > 200 || !nik) return null;
  const [expStr, wargaId, sig] = token.split(".");
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || !wargaId || !sig || exp < Date.now()) return null;
  if (!samaAman(tandatangani(`tiket-konfirmasi:${expStr}:${wargaId}:${nik}`, k), sig)) return null;
  return wargaId;
}

/* ------------------------ tiket tebak tempat lahir ------------------------ */
// Diterbitkan SETELAH NIK + tanggal lahir cocok dan memuat daftar pilihan
// tersamar yang ditampilkan ke warga (bertanda tangan, jadi klien tidak bisa
// mengarang pilihan sendiri). Mengikat warga_id + NIK, berlaku 10 menit.
// Jawaban benar TIDAK ada di tiket; dihitung ulang dari database.

export function buatTiketTempatLahir(wargaId, nik, opsi) {
  const k = kunci();
  if (!k || !wargaId || !nik || !Array.isArray(opsi) || opsi.length === 0) return null;
  const exp = String(Date.now() + MASA_TIKET_MENIT * 60 * 1000);
  const opsiB64 = Buffer.from(JSON.stringify(opsi)).toString("base64url");
  return `${exp}.${wargaId}.${opsiB64}.${tandatangani(`tiket-tl:${exp}:${wargaId}:${nik}:${opsiB64}`, k)}`;
}

/** Kembalikan { wargaId, opsi } kalau tiket sah untuk NIK ini & belum kedaluwarsa, selain itu null. */
export function bacaTiketTempatLahir(token, nik) {
  const k = kunci();
  if (!k || typeof token !== "string" || token.length > 1200 || !nik) return null;
  const [expStr, wargaId, opsiB64, sig] = token.split(".");
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || !wargaId || !opsiB64 || !sig || exp < Date.now()) return null;
  if (!samaAman(tandatangani(`tiket-tl:${expStr}:${wargaId}:${nik}:${opsiB64}`, k), sig)) return null;
  try {
    const opsi = JSON.parse(Buffer.from(opsiB64, "base64url").toString("utf8"));
    if (!Array.isArray(opsi) || !opsi.every((o) => typeof o === "string")) return null;
    return { wargaId, opsi };
  } catch {
    return null;
  }
}
