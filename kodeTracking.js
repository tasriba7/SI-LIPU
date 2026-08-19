// Generator kode tracking untuk layanan warga tanpa login (pengajuan
// surat, pengaduan warga, dll.). Format: PREFIX-XXXXXX — 6 karakter acak,
// huruf besar + angka, tanpa karakter yang gampang salah baca (0/O, 1/I).
const KARAKTER = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function buatKodeTracking(prefix) {
  let acak = "";
  for (let i = 0; i < 6; i++) {
    acak += KARAKTER[Math.floor(Math.random() * KARAKTER.length)];
  }
  return `${prefix}-${acak}`;
}
