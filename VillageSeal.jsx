// Emblem "cap desa" digital — terinspirasi stempel resmi yang biasa
// dibubuhkan perangkat desa di atas surat-surat warga untuk mengesahkannya.
// Di sini dibuat ulang sebagai identitas visual portal: cincin bertakik
// yang berputar pelan (menandakan "sedang aktif memverifikasi"), dengan
// logo asli SI-LIPU diam di tengah. Warna mengikuti `currentColor` supaya
// bisa dipasang di atas latar apa pun.
const TITIK = Array.from({ length: 48 });

export default function VillageSeal({ className = "" }) {
  return (
    <div className={`relative ${className}`} aria-hidden="true">
      <svg
        viewBox="0 0 240 240"
        className="h-full w-full motion-safe:animate-[spin_60s_linear_infinite]"
      >
        <circle
          cx="120"
          cy="120"
          r="114"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.25"
          strokeWidth="1"
        />
        <circle
          cx="120"
          cy="120"
          r="92"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.45"
          strokeWidth="1"
        />
        <g stroke="currentColor" strokeOpacity="0.55">
          {TITIK.map((_, i) => {
            const sudut = (i * 360) / TITIK.length;
            const utama = i % 4 === 0;
            return (
              <line
                key={i}
                x1="120"
                y1="15"
                x2="120"
                y2={utama ? "29" : "23"}
                strokeWidth={utama ? 1.5 : 1}
                transform={`rotate(${sudut} 120 120)`}
              />
            );
          })}
        </g>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex h-[42%] w-[42%] items-center justify-center rounded-full bg-white/5 ring-1 ring-white/15 backdrop-blur-sm">
          <img
            src="/logo-si-lipu.png"
            alt=""
            className="h-3/5 w-3/5 object-contain"
          />
        </div>
      </div>
    </div>
  );
}
