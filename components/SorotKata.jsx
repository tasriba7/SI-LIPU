// Menandai (<mark>) kata kunci pencarian di dalam teks. Murni tampilan; teks
// dirender sebagai teks biasa (React meng-escape), bukan HTML.
function lolosRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");
}

export default function SorotKata({ teks, kata = [] }) {
  const daftar = kata.filter(Boolean);
  if (!teks || daftar.length === 0) return teks || null;

  const pola = new RegExp(`(${daftar.map(lolosRegex).join("|")})`, "gi");
  const bagian = teks.split(pola);
  const kecil = daftar.map((k) => k.toLowerCase());

  return bagian.map((b, i) =>
    kecil.includes(b.toLowerCase()) ? (
      <mark key={i} className="rounded bg-gold/30 px-0.5 text-inherit">
        {b}
      </mark>
    ) : (
      <span key={i}>{b}</span>
    ),
  );
}
