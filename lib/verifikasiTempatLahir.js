import { createHash } from "node:crypto";
import { ambilIdentifier } from "@/lib/lookupWarga";
import { buatTiketTempatLahir, bacaTiketTempatLahir } from "@/lib/buktiVerifikasi";

// Faktor ketiga setelah NIK + tanggal lahir: warga memilih tempat lahirnya dari
// beberapa pilihan bertanda inisial (mis. "Tatakalai" -> "T***K***I").
// Salah memilih BATAS_SALAH kali -> pencarian dibatalkan & warga itu dikunci
// JAM_KUNCI jam. Semua penghitungan di server (service_role), bukan di klien.

export const BATAS_SALAH = 3;
export const JUMLAH_PILIHAN = 6; // 1 benar + 5 pengecoh (makin banyak, makin sulit ditebak)
const JAM_KUNCI = 24;
const BATAS_PER_IP_PER_JAM = 10; // cegah satu IP menebak banyak warga sekaligus

export const PESAN_BATAL =
  "Verifikasi dibatalkan karena tempat lahir salah dipilih 3 kali. Demi menjaga keamanan data kependudukan, pencarian data ini dihentikan untuk sementara. Silakan coba lagi besok, atau datang ke kantor desa dengan membawa KTP/KK.";
export const PESAN_KEDALUWARSA = "Sesi verifikasi sudah kedaluwarsa. Ulangi dari awal.";
export const PESAN_GALAT = "Verifikasi belum bisa diproses. Coba lagi nanti.";

// Pengecoh cadangan kalau data warga belum cukup beragam.
const PENGECOH_CADANGAN = [
  "Manado", "Tomohon", "Bitung", "Kotamobagu", "Tondano", "Amurang", "Airmadidi",
  "Tahuna", "Melonguane", "Likupang", "Langowan", "Ratahan", "Remboken", "Kawangkoan",
  "Gorontalo", "Makassar", "Palu", "Kendari", "Ternate", "Ambon", "Jakarta",
  "Surabaya", "Bandung", "Medan", "Balikpapan", "Banjarmasin", "Kupang", "Denpasar",
];

/**
 * Samarkan: hanya huruf pada urutan ke-1, 5, 9, ... yang terlihat, sisanya
 * bintang (spasi dipertahankan). "Tatakalai" -> "T***K***I".
 */
export function maskTempatLahir(teks) {
  return Array.from(String(teks ?? "").trim().toUpperCase())
    .map((c, i) => (c === " " ? " " : i % 4 === 0 ? c : "*"))
    .join("");
}

const norm = (t) => String(t ?? "").trim().toLowerCase();
const hash = (s) => createHash("sha256").update(s).digest("hex");

async function hitungGagalWarga(admin, wargaId) {
  const sejak = new Date(Date.now() - JAM_KUNCI * 3600 * 1000).toISOString();
  const { count, error } = await admin
    .from("percobaan_tempat_lahir")
    .select("id", { count: "exact", head: true })
    .eq("warga_id", wargaId)
    .eq("berhasil", false)
    .gt("created_at", sejak);
  return error ? null : count ?? 0;
}

async function hitungGagalIdentifier(admin, identifier) {
  const sejak = new Date(Date.now() - 3600 * 1000).toISOString();
  const { count, error } = await admin
    .from("percobaan_tempat_lahir")
    .select("id", { count: "exact", head: true })
    .eq("identifier", identifier)
    .eq("berhasil", false)
    .gt("created_at", sejak);
  return error ? null : count ?? 0;
}

/**
 * Susun pilihan: 1 jawaban benar + pengecoh. Pilihan DETERMINISTIK per warga
 * (diurutkan dengan hash), jadi menyegarkan halaman tidak memunculkan pengecoh
 * baru yang membocorkan mana jawaban benar. Pengecoh dipilih yang panjang
 * katanya mirip, dan tidak ada dua pilihan dengan inisial yang sama.
 */
async function susunPilihan(admin, wargaId, asli) {
  const maskAsli = maskTempatLahir(asli);
  const { data: baris } = await admin
    .from("warga")
    .select("tempat_lahir")
    .not("tempat_lahir", "is", null)
    .limit(1000);

  const calon = new Map(); // inisial -> nama
  for (const t of [...(baris ?? []).map((b) => b.tempat_lahir), ...PENGECOH_CADANGAN]) {
    const n = norm(t);
    if (!n || n === norm(asli)) continue;
    const m = maskTempatLahir(t);
    if (m === maskAsli || calon.has(m)) continue;
    calon.set(m, String(t).trim());
  }

  const urut = [...calon.entries()].sort((a, b) => {
    const jauhA = Math.abs(a[1].length - asli.length) > 2 ? 1 : 0;
    const jauhB = Math.abs(b[1].length - asli.length) > 2 ? 1 : 0;
    if (jauhA !== jauhB) return jauhA - jauhB;
    return hash(`${wargaId}:${a[0]}`).localeCompare(hash(`${wargaId}:${b[0]}`));
  });

  const pengecoh = urut.slice(0, JUMLAH_PILIHAN - 1).map(([m]) => m);
  return [maskAsli, ...pengecoh].sort((a, b) =>
    hash(`${wargaId}:urut:${a}`).localeCompare(hash(`${wargaId}:urut:${b}`))
  );
}

/**
 * Mulai tantangan setelah NIK + tanggal lahir cocok.
 * Return:
 *  - { lewati: true }                      tempat lahir belum terisi di data -> tidak bisa ditanyakan
 *  - { batal: true, pesan }                terkunci (sudah 3 kali salah) atau gagal-tertutup
 *  - { opsi, tiket, sisa }                 tampilkan pilihan ke warga
 */
export async function mulaiVerifikasiTempatLahir(admin, wargaId, nik) {
  const { data: w, error } = await admin
    .from("warga")
    .select("tempat_lahir")
    .eq("id", wargaId)
    .maybeSingle();
  if (error || !w) return { batal: true, pesan: PESAN_GALAT };

  const asli = String(w.tempat_lahir ?? "").trim();
  if (!asli) return { lewati: true };

  const gagal = await hitungGagalWarga(admin, wargaId);
  if (gagal === null) return { batal: true, pesan: PESAN_GALAT }; // gagal-tertutup
  if (gagal >= BATAS_SALAH) return { batal: true, pesan: PESAN_BATAL };

  const opsi = await susunPilihan(admin, wargaId, asli);
  const tiket = buatTiketTempatLahir(wargaId, nik, opsi);
  if (!tiket) return { batal: true, pesan: PESAN_GALAT };

  return { opsi, tiket, sisa: BATAS_SALAH - gagal };
}

/**
 * Periksa pilihan warga. Percobaan DICATAT DULU baru dinilai, supaya permintaan
 * paralel tidak bisa menebak lebih dari batas.
 * Return:
 *  - { ok: true, wargaId }
 *  - { salah: true, sisa }
 *  - { batal: true, pesan }
 *  - { kedaluwarsa: true, pesan }
 *  - { error }
 */
export async function periksaPilihanTempatLahir(admin, nik, tiket, pilihan) {
  const t = bacaTiketTempatLahir(tiket, String(nik ?? "").trim());
  if (!t) return { kedaluwarsa: true, pesan: PESAN_KEDALUWARSA };

  const identifier = await ambilIdentifier();
  const { data: baris, error: errInsert } = await admin
    .from("percobaan_tempat_lahir")
    .insert({ warga_id: t.wargaId, identifier, berhasil: false })
    .select("id")
    .single();
  if (errInsert || !baris) return { error: PESAN_GALAT };

  const gagal = await hitungGagalWarga(admin, t.wargaId);
  const gagalIp = await hitungGagalIdentifier(admin, identifier);
  if (gagal === null || gagalIp === null) return { error: PESAN_GALAT };
  // Sudah terkunci sebelum percobaan ini, atau satu IP menebak terlalu banyak.
  if (gagal > BATAS_SALAH || gagalIp > BATAS_PER_IP_PER_JAM) {
    return { batal: true, pesan: PESAN_BATAL };
  }

  const { data: w } = await admin
    .from("warga")
    .select("tempat_lahir")
    .eq("id", t.wargaId)
    .maybeSingle();

  const benar =
    typeof pilihan === "string" &&
    t.opsi.includes(pilihan) &&
    !!w?.tempat_lahir &&
    pilihan === maskTempatLahir(w.tempat_lahir);

  if (benar) {
    await admin.from("percobaan_tempat_lahir").update({ berhasil: true }).eq("id", baris.id);
    // Identitas terbukti: hapus catatan salah lama supaya tidak menghalangi layanan lain.
    await admin
      .from("percobaan_tempat_lahir")
      .delete()
      .eq("warga_id", t.wargaId)
      .eq("berhasil", false);
    return { ok: true, wargaId: t.wargaId };
  }

  if (gagal >= BATAS_SALAH) return { batal: true, pesan: PESAN_BATAL };
  return { salah: true, sisa: BATAS_SALAH - gagal };
}
