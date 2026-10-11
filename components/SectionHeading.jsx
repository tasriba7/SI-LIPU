// Judul bagian (section) yang seragam di seluruh halaman publik:
// label kecil bergaris emas, judul besar, deskripsi opsional, dan slot `aksi`
// di sisi kanan (mis. tautan "Lihat semua"). Murni tampilan.
//   rata: "kiri" (bawaan) | "tengah"
export default function SectionHeading({ kecil, judul, deskripsi, aksi = null, rata = "kiri" }) {
  const tengah = rata === "tengah";

  return (
    <div
      className={`flex flex-wrap gap-4 ${
        tengah ? "flex-col items-center text-center" : "items-end justify-between"
      }`}
    >
      <div className={tengah ? "mx-auto" : ""}>
        {kecil && (
          <p
            className={`inline-flex items-center gap-2.5 font-mono text-xs uppercase font-semibold tracking-[0.25em] text-royal ${
              tengah ? "justify-center" : ""
            }`}
          >
            <span aria-hidden className="h-[2px] w-8 bg-gradient-to-r from-gold to-transparent" />
            {kecil}
            {tengah && (
              <span aria-hidden className="h-[2px] w-8 bg-gradient-to-l from-gold to-transparent" />
            )}
          </p>
        )}
        <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-navy-dark sm:text-4xl">
          {judul}
        </h2>
        <span aria-hidden className={`garis-aksen mt-4 block ${tengah ? "mx-auto" : ""}`} />
        {deskripsi && (
          <p
            className={`mt-3 max-w-xl text-sm leading-relaxed text-slate-500 sm:text-base ${
              tengah ? "mx-auto" : ""
            }`}
          >
            {deskripsi}
          </p>
        )}
      </div>
      {aksi}
    </div>
  );
}
