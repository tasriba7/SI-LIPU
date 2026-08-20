import { IconFileSpreadsheet } from "@/components/icons";

/**
 * Tautan unduh langsung ke /api/kependudukan/export — tidak perlu
 * JavaScript di sisi client, browser yang menangani proses unduh filenya.
 * Kalau ada filter pencarian aktif di halaman, ikut dikirim supaya hasil
 * ekspor mengikuti data yang sedang ditampilkan.
 */
export default function ExportWargaButton({ cari }) {
  const href = cari
    ? `/api/kependudukan/export?cari=${encodeURIComponent(cari)}`
    : "/api/kependudukan/export";

  return (
    <a
      href={href}
      className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
    >
      <IconFileSpreadsheet className="h-4 w-4" />
      Ekspor ke Excel
    </a>
  );
}
