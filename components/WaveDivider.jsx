// Gelombang pemisah di tepi bawah hero/banner. Dua lapis gelombang bergeser
// pelan ke arah berlawanan. Warna memakai `currentColor` -> atur lewat
// className (mis. "text-white") agar sama dengan warna bagian di bawahnya.
// Animasi dijeda saat di luar layar (kelas anim-saat-tampil).
const GELOMBANG =
  "M0 60 C 120 20, 240 20, 360 60 S 600 100, 720 60 S 960 20, 1080 60 S 1320 100, 1440 60 L1440 120 L0 120 Z";

function Lapisan({ className, animasi, arah = "" }) {
  return (
    <div className={`absolute inset-x-0 bottom-0 h-full overflow-hidden ${className}`}>
      {/* Lebar 200% berisi dua salinan gelombang, digeser -50% supaya mulus tanpa putus. */}
      <div className={`flex h-full w-[200%] ${animasi} ${arah}`}>
        {[0, 1].map((i) => (
          <svg
            key={i}
            viewBox="0 0 1440 120"
            preserveAspectRatio="none"
            className="h-full w-1/2"
            aria-hidden="true"
          >
            <path d={GELOMBANG} fill="currentColor" />
          </svg>
        ))}
      </div>
    </div>
  );
}

export default function WaveDivider({ className = "text-white", tinggi = "h-12 sm:h-16 md:h-20" }) {
  return (
    <div
      aria-hidden="true"
      className={`anim-saat-tampil pointer-events-none relative w-full ${tinggi} ${className}`}
    >
      <Lapisan className="opacity-30" animasi="animate-gelombang [animation-duration:30s]" arah="[animation-direction:reverse]" />
      <Lapisan className="opacity-60" animasi="animate-gelombang [animation-duration:42s]" />
      <Lapisan className="opacity-100 translate-y-px" animasi="" />
    </div>
  );
}
