// Helper untuk menyamarkan (mask) data warga sebelum ditampilkan sebagai
// konfirmasi "Apakah ini Anda?" — WAJIB dipakai sesuai docs/SECURITY.md
// poin 3, JANGAN tampilkan data lengkap sebelum warga konfirmasi.

export function maskNama(nama) {
  if (!nama) return "";
  return nama
    .split(" ")
    .map((kata) => {
      if (kata.length <= 2) return kata[0] + "*".repeat(Math.max(kata.length - 1, 1));
      return kata[0] + "*".repeat(kata.length - 1);
    })
    .join(" ");
}

export function maskWilayah(teks) {
  if (!teks) return "-";
  if (teks.length <= 1) return teks;
  return teks[0] + "*".repeat(teks.length - 1);
}
