// Tampil otomatis di bawah header (header tidak ikut hilang) selagi
// halaman tujuan masih mengambil data dari database — supaya perpindahan
// terasa merespons langsung, bukan diam dulu sebelum mendadak muncul.
export default function PublikLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        {/* Dua cincin berputar berlawanan arah: navy di luar, emas di dalam */}
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-navy/15 border-t-navy" />
          <div className="absolute inset-2 animate-spin rounded-full border-2 border-gold/20 border-b-gold [animation-direction:reverse] [animation-duration:1.2s]" />
        </div>
        <p className="text-xs tracking-wide text-slate-400">Memuat...</p>
      </div>
    </div>
  );
}
