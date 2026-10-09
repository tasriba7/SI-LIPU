// Penamaan & daftar Dusun. Daftar dusun = slot posisi berperan "kadus" yang
// dibuat Administrator (tabel posisi_perangkat), jadi tidak ada tabel baru.
// Form data warga memilih dari daftar ini (dropdown), bukan mengetik bebas.

// Salinan JavaScript dari fungsi SQL norm_wil() (migrasi 0015): huruf kecil,
// buang awalan dusun/rt/rw, rapikan spasi, buang angka nol di depan.
export function normWil(teks) {
  const s = String(teks ?? "")
    .replace(/^\s*(dusun|rt|rw)(\s*[.:\-]\s*|\s+|(?=\d))/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  if (!s) return null;
  if (/^\d+$/.test(s)) return s.replace(/^0+/, "") || "0";
  return s;
}

const KATA_JABATAN = /\b(kepala|kadus|ketua|desa|rt|rw|dusun)\b/i;

/**
 * Rapikan isian admin untuk slot Kepala Dusun menjadi "Dusun <nama/nomor>".
 * Admin cukup mengisi nama atau nomor ("1", "01", "Melati", "Dusun 1").
 * Isian berisi nama jabatan ("Kepala Dusun 01") ditolak.
 * Return: { nilai } atau { error }
 */
export function formatNamaDusun(input) {
  const awal = String(input ?? "").trim();
  const sisa = awal
    .replace(/^\s*dusun(\s*[.:\-]\s*|\s+|(?=\d))/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!sisa) return { error: "Nama atau nomor dusun wajib diisi." };
  if (KATA_JABATAN.test(sisa)) {
    return {
      error:
        'Isi hanya nama atau nomor dusun (mis. "1" atau "Melati"), bukan nama jabatan.',
    };
  }
  if (sisa.length > 40 || !/^[\p{L}\p{N}][\p{L}\p{N} .'-]*$/u.test(sisa)) {
    return {
      error:
        "Nama dusun hanya boleh huruf, angka, spasi, titik, atau tanda hubung (maks. 40 karakter).",
    };
  }
  const nilai = /^\d+$/.test(sisa) ? sisa.replace(/^0+/, "") || "0" : sisa;
  return { nilai: `Dusun ${nilai}` };
}

/** Semua nama dusun yang sudah dibuat admin (unik, urut angka/abjad). */
export async function ambilDaftarDusun(supabase) {
  const { data } = await supabase
    .from("posisi_perangkat")
    .select("wilayah")
    .eq("role", "kadus");
  const unik = [...new Set((data ?? []).map((r) => r.wilayah).filter(Boolean))];
  return unik.sort((a, b) => a.localeCompare(b, "id", { numeric: true }));
}

/** Cocokkan isian dengan daftar; kembalikan penulisan resmi dari daftar, atau null. */
export function cocokkanDusun(nilai, daftar) {
  const k = normWil(nilai);
  if (!k) return null;
  return daftar.find((d) => normWil(d) === k) ?? null;
}

/**
 * Validasi isian Dusun di server. Kosong = diizinkan (RLS tetap membatasi
 * Kadus/Ketua RT). `dusunBolehTetap` = nilai yang sudah tersimpan di data
 * lama dan tidak diubah (data lama dengan ejaan beda tidak memblokir edit).
 * Return: { nilai } (nilai resmi atau null) atau { error }
 */
export function periksaDusun(nilai, daftar, dusunBolehTetap = null) {
  const teks = String(nilai ?? "").trim();
  if (!teks) return { nilai: null };
  if (dusunBolehTetap && teks === dusunBolehTetap) return { nilai: teks };
  if (daftar.length === 0) {
    return {
      error:
        "Daftar dusun belum dibuat. Minta Administrator menambahkan dusun lebih dulu di menu Posisi.",
    };
  }
  const resmi = cocokkanDusun(teks, daftar);
  if (!resmi) {
    return { error: `Dusun "${teks}" tidak ada di daftar. Pilih dusun dari pilihan yang tersedia.` };
  }
  return { nilai: resmi };
}

/**
 * Untuk halaman form: daftar pilihan dusun sesuai akun yang login.
 * Kadus hanya melihat dusunnya sendiri (terkunci kalau tepat satu cocok).
 */
export async function ambilPilihanDusun(supabase) {
  const daftar = await ambilDaftarDusun(supabase);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let role = null;
  let dusunSaya = null;
  if (user) {
    const { data: p } = await supabase
      .from("profiles")
      .select("role, dusun")
      .eq("id", user.id)
      .maybeSingle();
    role = p?.role ?? null;
    dusunSaya = p?.dusun ?? null;
  }
  let pilihan = daftar;
  if (role === "kadus") {
    const cocok = daftar.filter((d) => normWil(d) === normWil(dusunSaya));
    if (cocok.length > 0) pilihan = cocok;
  }
  return { daftar, pilihan, terkunci: role === "kadus" && pilihan.length === 1 && pilihan !== daftar };
}
