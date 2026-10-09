import { randomInt } from "node:crypto";

// Password acak untuk akun staf. Memakai crypto.randomInt (CSPRNG), tanpa
// karakter yang mudah tertukar (0/O, 1/l/I). 12 karakter dari 57 simbol
// ~ 70 bit entropi (sebelumnya: 12 karakter UUID ~ 44 bit).
// JANGAN diimpor dari Client Component.
const ALFABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export const PASSWORD_MINIMAL = 8;

export function buatPasswordAcak(panjang = 12) {
  let hasil = "";
  for (let i = 0; i < panjang; i++) hasil += ALFABET[randomInt(ALFABET.length)];
  return hasil;
}
