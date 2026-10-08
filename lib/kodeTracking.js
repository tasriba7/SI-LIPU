// Generator kode tracking untuk layanan warga tanpa login (pengajuan
// surat, pengaduan warga, dll.). Format: PREFIX-XXXXXX — 6 karakter acak,
// huruf besar + angka, tanpa karakter yang gampang salah baca (0/O, 1/I).
//
// Memakai crypto (bukan Math.random) supaya kode tidak bisa ditebak.
// Untuk pengaduan ANONIM, kode adalah satu-satunya "kunci" pelapor, jadi
// dipanjangkan (parameter `panjang`) agar mustahil ditebak orang lain.
const KARAKTER = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 karakter

export function buatKodeTracking(prefix, panjang = 6) {
  const bytes = new Uint8Array(panjang);
  crypto.getRandomValues(bytes);
  let acak = "";
  for (let i = 0; i < panjang; i++) {
    acak += KARAKTER[bytes[i] % KARAKTER.length]; // 256 habis dibagi 32 -> merata
  }
  return `${prefix}-${acak}`;
}
