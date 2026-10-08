// Ubah nomor HP lokal (08xx / +62 / 62) jadi tautan wa.me dengan pesan awal.
export function linkWhatsApp(noHp, pesan = "") {
  let n = String(noHp || "").replace(/\D/g, "");
  if (!n) return null;
  if (n.startsWith("0")) n = "62" + n.slice(1);
  else if (n.startsWith("8")) n = "62" + n;
  return `https://wa.me/${n}${pesan ? `?text=${encodeURIComponent(pesan)}` : ""}`;
}
