// Ekspor statistik kependudukan beranda ke PDF & Excel (jalan di browser).
// Library berat di-import dinamis supaya tidak membebani muat awal beranda.

const NAVY = "1B2A49";
const GOLD = "E8B933";
const ZEBRA = "F3F6FB";

const tanggalCetak = () =>
  new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

const slug = (s) => String(s || "desa").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * Bentuk tabel seragam untuk kedua format.
 * tiap tabel: { nama, judul, ket, kolom: [..], rows: [[label, jumlah, (laki, perempuan)]] }
 */
export function susunTabel({ detail = {}, perDusun = [] }) {
  const {
    perJenisKelamin = [], perRentangUsia = [], perPekerjaan = [],
    perAgama = [], perStatusKawin = [],
  } = detail;
  const sederhana = (rows) => rows.map((r) => [r.label, r.jumlah]);
  const tabel = [
    { nama: "Jenis Kelamin", judul: "Penduduk menurut Jenis Kelamin", rows: sederhana(perJenisKelamin) },
    { nama: "Kelompok Usia", judul: "Penduduk menurut Kelompok Usia", rows: sederhana(perRentangUsia) },
    { nama: "Pekerjaan", judul: "Penduduk menurut Pekerjaan", rows: sederhana(perPekerjaan) },
    { nama: "Agama", judul: "Penduduk menurut Agama", rows: sederhana(perAgama) },
    { nama: "Status Nikah", judul: "Penduduk menurut Status Pernikahan", rows: sederhana(perStatusKawin) },
  ].map((t) => ({ ...t, kolom: ["Kategori", "Jumlah", "Persentase"] }));

  if (perDusun.length > 1) {
    tabel.push({
      nama: "Per Dusun",
      judul: "Penduduk menurut Dusun",
      kolom: ["Dusun", "Laki-laki", "Perempuan", "Jumlah", "Persentase"],
      rows: perDusun.map((d) => [d.label, d.laki, d.perempuan, d.jumlah]),
      dusun: true,
    });
  }
  return tabel.filter((t) => t.rows.length > 0);
}

const jumlahIdx = (t) => (t.dusun ? 3 : 1);
const totalTabel = (t) => t.rows.reduce((s, r) => s + (r[jumlahIdx(t)] || 0), 0);
const persenTeks = (n, total) =>
  total ? `${((n / total) * 100).toFixed(1).replace(".", ",")}%` : "0,0%";

function unduh(blob, nama) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nama;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------------------------------------------------------------------------
// EXCEL
// ---------------------------------------------------------------------------
export async function eksporExcel({ detail, perDusun, namaDesa, wilayah }) {
  const ExcelJS = (await import("exceljs")).default;
  const tabel = susunTabel({ detail, perDusun });
  const wb = new ExcelJS.Workbook();
  wb.creator = "SI-LIPU";
  wb.created = new Date();

  const garis = { style: "thin", color: { argb: "FFD5DCE8" } };
  const border = { top: garis, left: garis, bottom: garis, right: garis };

  tabel.forEach((t) => {
    const ws = wb.addWorksheet(t.nama, {
      views: [{ showGridLines: false, state: "frozen", ySplit: 5 }],
      pageSetup: { orientation: "portrait", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });
    const n = t.kolom.length;
    ws.columns = t.kolom.map((_, i) => ({ width: i === 0 ? 34 : 15 }));

    // Judul
    ws.mergeCells(1, 1, 1, n);
    const j = ws.getCell(1, 1);
    j.value = `STATISTIK KEPENDUDUKAN — ${(namaDesa || "").toUpperCase()}`.trim();
    j.font = { name: "Calibri", size: 15, bold: true, color: { argb: "FFFFFFFF" } };
    j.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${NAVY}` } };
    j.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    ws.getRow(1).height = 30;

    ws.mergeCells(2, 1, 2, n);
    const w = ws.getCell(2, 1);
    w.value = wilayah || "";
    w.font = { size: 10, color: { argb: "FFFFFFFF" } };
    w.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${NAVY}` } };
    w.alignment = { indent: 1 };

    ws.mergeCells(3, 1, 3, n);
    const s = ws.getCell(3, 1);
    s.value = t.judul;
    s.font = { size: 12, bold: true, color: { argb: `FF${NAVY}` } };
    s.border = { bottom: { style: "medium", color: { argb: `FF${GOLD}` } } };
    ws.getRow(3).height = 24;
    ws.getCell(4, 1).value = `Dicetak: ${tanggalCetak()}`;
    ws.getCell(4, 1).font = { size: 9, italic: true, color: { argb: "FF6B7280" } };

    // Header kolom
    const h = ws.getRow(5);
    t.kolom.forEach((k, i) => {
      const c = h.getCell(i + 1);
      c.value = k;
      c.font = { bold: true, color: { argb: `FF${NAVY}` } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${GOLD}` } };
      c.alignment = { horizontal: i === 0 ? "left" : "center", vertical: "middle", indent: i === 0 ? 1 : 0 };
      c.border = border;
    });
    h.height = 22;

    // Isi
    const awal = 6;
    const akhir = awal + t.rows.length - 1;
    const total = akhir + 1;
    const kJum = jumlahIdx(t) + 1; // nomor kolom jumlah (1-based)
    const hurufJum = String.fromCharCode(64 + kJum);

    t.rows.forEach((r, idx) => {
      const row = ws.getRow(awal + idx);
      r.forEach((v, i) => (row.getCell(i + 1).value = v));
      row.getCell(n).value = { formula: `IF($${hurufJum}$${total}=0,0,${hurufJum}${awal + idx}/$${hurufJum}$${total})` };
      row.eachCell({ includeEmpty: true }, (c, col) => {
        if (col > n) return;
        c.border = border;
        c.alignment = { horizontal: col === 1 ? "left" : "right", vertical: "middle", indent: col === 1 ? 1 : 0 };
        if (idx % 2 === 1) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${ZEBRA}` } };
        if (col > 1 && col < n) c.numFmt = "#,##0";
      });
      row.getCell(n).numFmt = "0.0%";
      row.height = 19;
    });

    // Total
    const rt = ws.getRow(total);
    rt.getCell(1).value = "TOTAL";
    for (let c = 2; c < n; c++) {
      const L = String.fromCharCode(64 + c);
      rt.getCell(c).value = { formula: `SUM(${L}${awal}:${L}${akhir})` };
      rt.getCell(c).numFmt = "#,##0";
    }
    rt.getCell(n).value = { formula: `SUM(${String.fromCharCode(64 + n)}${awal}:${String.fromCharCode(64 + n)}${akhir})` };
    rt.getCell(n).numFmt = "0.0%";
    for (let c = 1; c <= n; c++) {
      const cell = rt.getCell(c);
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${NAVY}` } };
      cell.alignment = { horizontal: c === 1 ? "left" : "right", indent: c === 1 ? 1 : 0 };
    }
    rt.height = 22;

    // Mini bar di kolom persentase (data bar)
    ws.addConditionalFormatting({
      ref: `${String.fromCharCode(64 + n)}${awal}:${String.fromCharCode(64 + n)}${akhir}`,
      rules: [{ type: "dataBar", gradient: true, color: { argb: "FF3FA9F5" }, cfvo: [{ type: "num", value: 0 }, { type: "num", value: 1 }] }],
    });
  });

  const buf = await wb.xlsx.writeBuffer();
  unduh(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `statistik-kependudukan-${slug(namaDesa)}.xlsx`
  );
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------
export async function eksporPdf({ detail, perDusun, namaDesa, wilayah }) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const tabel = susunTabel({ detail, perDusun });

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 14;
  const hex = (h) => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];

  // Kop
  doc.setFillColor(...hex(NAVY));
  doc.rect(0, 0, W, 34, "F");
  doc.setFillColor(...hex(GOLD));
  doc.rect(0, 34, W, 1.6, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold").setFontSize(18);
  doc.text("STATISTIK KEPENDUDUKAN", M, 15);
  doc.setFontSize(12).setFont("helvetica", "normal");
  doc.text(namaDesa || "", M, 22);
  doc.setFontSize(9).setTextColor(200, 210, 230);
  doc.text(wilayah || "", M, 28);
  doc.text(`Dicetak ${tanggalCetak()}`, W - M, 28, { align: "right" });

  // Kartu ringkasan
  const jk = tabel.find((t) => t.nama === "Jenis Kelamin");
  const ambil = (l) => jk?.rows.find((r) => r[0] === l)?.[1] || 0;
  const laki = ambil("Laki-laki"), pr = ambil("Perempuan");
  const total = jk ? totalTabel(jk) : 0;
  const kartu = [
    ["Total Penduduk", total],
    ["Laki-laki", laki],
    ["Perempuan", pr],
  ];
  const cw = (W - 2 * M - 8) / 3;
  kartu.forEach(([l, v], i) => {
    const x = M + i * (cw + 4);
    doc.setFillColor(243, 246, 251);
    doc.setDrawColor(213, 220, 232);
    doc.roundedRect(x, 42, cw, 22, 2, 2, "FD");
    doc.setTextColor(107, 114, 128).setFontSize(8).setFont("helvetica", "normal");
    doc.text(l.toUpperCase(), x + 4, 49);
    doc.setTextColor(...hex(NAVY)).setFontSize(17).setFont("helvetica", "bold");
    doc.text(Number(v).toLocaleString("id-ID"), x + 4, 59);
    doc.setFillColor(...hex(GOLD));
    doc.rect(x, 42, 1.4, 22, "F");
  });

  let y = 74;
  tabel.forEach((t) => {
    const tot = totalTabel(t);
    const body = t.rows.map((r) => [
      r[0],
      ...r.slice(1).map((v) => Number(v).toLocaleString("id-ID")),
      persenTeks(r[jumlahIdx(t)], tot),
    ]);
    const foot = [
      "TOTAL",
      ...t.rows[0].slice(1).map((_, i) =>
        t.rows.reduce((s, r) => s + (r[i + 1] || 0), 0).toLocaleString("id-ID")
      ),
      "100%",
    ];

    // Judul tabel
    if (y > H - 55) { doc.addPage(); y = 18; }
    doc.setTextColor(...hex(NAVY)).setFont("helvetica", "bold").setFontSize(11);
    doc.text(t.judul, M, y);
    doc.setDrawColor(...hex(GOLD)).setLineWidth(0.6);
    doc.line(M, y + 1.8, M + 16, y + 1.8);

    autoTable(doc, {
      startY: y + 5,
      head: [t.kolom],
      body,
      foot: [foot],
      margin: { left: M, right: M },
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 2.2, lineColor: [213, 220, 232], lineWidth: 0.2, textColor: [40, 48, 66] },
      headStyles: { fillColor: hex(GOLD), textColor: hex(NAVY), fontStyle: "bold", halign: "center" },
      footStyles: { fillColor: hex(NAVY), textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [243, 246, 251] },
      columnStyles: Object.fromEntries(
        t.kolom.map((_, i) => [i, { halign: i === 0 ? "left" : "right" }])
      ),
      didParseCell: (d) => {
        if (d.section === "foot" && d.column.index > 0) d.cell.styles.halign = "right";
      },
    });
    y = doc.lastAutoTable.finalY + 10;
  });

  // Footer semua halaman
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setDrawColor(213, 220, 232).setLineWidth(0.2);
    doc.line(M, H - 12, W - M, H - 12);
    doc.setFontSize(8).setTextColor(107, 114, 128).setFont("helvetica", "normal");
    doc.text(`Sumber: SI-LIPU · ${namaDesa || ""}`, M, H - 7);
    doc.text(`Halaman ${i} dari ${n}`, W - M, H - 7, { align: "right" });
  }

  doc.save(`statistik-kependudukan-${slug(namaDesa)}.pdf`);
}
