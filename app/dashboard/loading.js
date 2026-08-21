// `loading.js` fitur bawaan Next.js: otomatis tampil di area konten
// dashboard (di dalam <main>, sidebar & header tetap diam) selagi halaman
// tujuan masih mengambil data dari database — supaya perpindahan antar
// menu dashboard tidak terasa "macet"/diam sesaat sebelum konten muncul.
export default function DashboardLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy/20 border-t-navy" />
        <p className="text-xs text-slate-400">Memuat...</p>
      </div>
    </div>
  );
}
