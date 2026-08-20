import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";

// Header sengaja disamakan dengan sheet "Data Penduduk" di
// public/template-import-penduduk.xlsx (tanpa tanda "*"), supaya file hasil
// ekspor ini juga bisa langsung diunggah lagi lewat menu Impor Data Penduduk
// kalau perlu diedit massal lalu dimasukkan ulang.
const HEADERS = [
  "NIK", "No. KK", "Nama Lengkap", "Tempat Lahir", "Tanggal Lahir",
  "Jenis Kelamin", "Status Kawin", "Status dalam KK", "Alamat", "Dusun",
  "RT", "RW", "No. HP", "Pekerjaan", "Agama",
];

const KOLOM = [
  "nik", "no_kk", "nama_lengkap", "tempat_lahir", "tanggal_lahir",
  "jenis_kelamin", "status_kawin", "status_dalam_kk", "alamat", "dusun",
  "rt", "rw", "no_hp", "pekerjaan", "agama",
];

const KOLOM_TEKS = new Set(["nik", "no_kk", "rt", "rw", "no_hp"]);
const UKURAN_HALAMAN = 1000;

export async function GET(request) {
  const supabase = await createClient();

  // Route Handler tidak ikut dilindungi middleware.js (yang cuma menjaga
  // /dashboard), jadi cek sesi login diulang di sini supaya data NIK warga
  // tidak bisa diambil orang yang belum login.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const cari = searchParams.get("cari")?.trim() || "";

  const semuaBaris = [];
  let dari = 0;
  while (true) {
    let query = supabase
      .from("warga")
      .select(KOLOM.join(","))
      .order("nama_lengkap")
      .range(dari, dari + UKURAN_HALAMAN - 1);

    if (cari) {
      query = query.or(`nama_lengkap.ilike.%${cari}%,nik.ilike.%${cari}%`);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: "Gagal mengambil data warga." }, { status: 500 });
    }
    semuaBaris.push(...(data ?? []));
    if (!data || data.length < UKURAN_HALAMAN) break;
    dari += UKURAN_HALAMAN;
  }

  const aoa = [HEADERS, ...semuaBaris.map((w) => KOLOM.map((k) => w[k] ?? ""))];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws["!cols"] = [18, 18, 26, 18, 14, 14, 14, 18, 30, 16, 8, 8, 16, 24, 18].map((wch) => ({ wch }));

  // NIK/No. KK/RT/RW/No. HP dipaksa format teks (angka depan nol atau
  // 16 digit tidak berubah jadi notasi ilmiah saat dibuka di Excel).
  // Tanggal Lahir diformat sebagai tanggal.
  semuaBaris.forEach((_, i) => {
    const r = i + 1; // baris 0 = header
    KOLOM.forEach((kolom, c) => {
      const alamatSel = XLSX.utils.encode_cell({ r, c });
      const sel = ws[alamatSel];
      if (!sel) return;
      if (KOLOM_TEKS.has(kolom)) sel.z = "@";
      if (kolom === "tanggal_lahir") sel.z = "yyyy-mm-dd";
    });
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data Penduduk");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const tanggal = new Date().toISOString().slice(0, 10);
  const namaFile = cari
    ? `data-penduduk-${cari.replace(/[^a-z0-9]+/gi, "-")}-${tanggal}.xlsx`
    : `data-penduduk-${tanggal}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${namaFile}"`,
      "Cache-Control": "no-store",
    },
  });
}
