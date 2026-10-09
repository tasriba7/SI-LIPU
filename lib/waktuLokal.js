// Helper murni (tanpa React) untuk jam & tanggal beranda. Dipisah dari
// komponen supaya mudah diuji di berbagai zona waktu.
//
// Semua dihitung dari zona waktu PERANGKAT yang membuka halaman — bukan
// zona server (di hosting biasanya UTC) dan tidak di-hardcode, jadi warga di
// WIB/WITA/WIT otomatis melihat jam setempatnya masing-masing.

const FORMAT_TANGGAL = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const dua = (n) => String(n).padStart(2, "0");

// Label zona waktu. Indonesia: UTC+7 = WIB, UTC+8 = WITA, UTC+9 = WIT.
// Di luar itu (mis. warga sedang di luar negeri) tampil "UTC+X".
export function labelZonaWaktu(date) {
  const menit = -date.getTimezoneOffset();
  if (menit === 420) return "WIB";
  if (menit === 480) return "WITA";
  if (menit === 540) return "WIT";
  const tanda = menit >= 0 ? "+" : "-";
  const abs = Math.abs(menit);
  const jam = Math.floor(abs / 60);
  const sisa = abs % 60;
  return `UTC${tanda}${jam}${sisa ? ":" + dua(sisa) : ""}`;
}

export function formatWaktuBeranda(date) {
  const bagian = FORMAT_TANGGAL.formatToParts(date);
  const ambil = (tipe) => bagian.find((p) => p.type === tipe)?.value || "";
  return {
    hari: ambil("weekday"), // "Jumat"
    tanggal: `${ambil("day")} ${ambil("month")} ${ambil("year")}`, // "9 Oktober 2026"
    jam: dua(date.getHours()),
    menit: dua(date.getMinutes()),
    detik: dua(date.getSeconds()),
    zona: labelZonaWaktu(date),
  };
}
