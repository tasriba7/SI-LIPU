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
      className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
    >
      <IconFileSpreadsheet className="h-4 w-4" />
      Ekspor ke Excel
    </a>
  );
}
