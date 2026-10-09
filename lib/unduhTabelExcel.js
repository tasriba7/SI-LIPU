// Unduh tabel sederhana jadi Excel (.xlsx) di BROWSER. Dipakai halaman
// Tautan Bagikan Data: data sudah ada di halaman, jadi unduhan tidak perlu
// memanggil server lagi (penting, karena tautan sudah hangus saat data tampil).

export const slugNama = (s) =>
  String(s || "desa").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const tanggalBerkas = () => new Date().toISOString().slice(0, 10);

export async function unduhTabelExcel({ header, baris, namaSheet, namaFile, lebar }) {
  const mod = await import("xlsx");
  const XLSX = mod.default ?? mod;

  const ws = XLSX.utils.aoa_to_sheet([header, ...baris]);
  if (lebar) ws["!cols"] = lebar.map((wch) => ({ wch }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, namaSheet);
  const isi = XLSX.write(wb, { type: "array", bookType: "xlsx" });

  const blob = new Blob([isi], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = namaFile;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
