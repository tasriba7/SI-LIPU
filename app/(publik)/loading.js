// Tampil otomatis di bawah header (header tidak ikut hilang) selagi
// halaman tujuan masih mengambil data dari database — supaya perpindahan
// terasa merespons langsung, bukan diam dulu sebelum mendadak muncul.
export default function PublikLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy/20 border-t-navy" />
        <p className="text-xs text-slate-400">Memuat...</p>
      </div>
    </div>
  );
}
