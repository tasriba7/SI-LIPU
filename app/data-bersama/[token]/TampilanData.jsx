"use client";

import { useState } from "react";
import { susunTabel, eksporExcel, eksporPdf } from "@/lib/eksporStatistik";
import { unduhTabelExcel, slugNama, tanggalBerkas } from "@/lib/unduhTabelExcel";
import { HEADER_PENDUDUK, HEADER_KELUARGA } from "@/lib/tautanDataSeksi";

const fmt = (n) => Number(n || 0).toLocaleString("id-ID");

function TombolUnduh({ children, onKlik }) {
  const [sibuk, setSibuk] = useState(false);
  return (
    <button
      type="button"
      disabled={sibuk}
      onClick={async () => {
        setSibuk(true);
        try {
          await onKlik();
        } catch {
          alert("Unduhan gagal. Coba tekan tombolnya sekali lagi.");
        }
        setSibuk(false);
      }}
      className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white transition hover:bg-navy-light disabled:opacity-60"
    >
      {sibuk ? "Menyiapkan..." : children}
    </button>
  );
}

function Pratinjau({ header, baris, kolom, batas = 8 }) {
  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full min-w-[480px] text-xs">
        <thead className="bg-slate-50 text-left text-slate-400">
          <tr>
            {kolom.map((i) => (
              <th key={i} className="px-3 py-2 font-medium">
                {header[i]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {baris.slice(0, batas).map((b, r) => (
            <tr key={r}>
              {kolom.map((i) => (
                <td key={i} className="px-3 py-2 text-slate-600">
                  {String(b[i] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {baris.length > batas && (
        <p className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-400">
          Menampilkan {batas} dari {fmt(baris.length)} baris. Lengkapnya ada di file unduhan.
        </p>
      )}
    </div>
  );
}

function Kartu({ judul, ket, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-slate-800">{judul}</h2>
      <p className="text-xs text-slate-500">{ket}</p>
      {children}
    </section>
  );
}

export default function TampilanData({ hasil }) {
  const { data, instansi, desa } = hasil;
  const namaDesa = desa?.nama || "";
  const label = [desa?.jenis, desa?.nama].filter(Boolean).join(" ");
  const berkas = (awal, ekstensi) =>
    `${awal}-${slugNama(namaDesa)}-${tanggalBerkas()}.${ekstensi}`;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border-2 border-red-300 bg-red-50 p-4 text-sm text-red-900">
        <p className="font-bold">Tautan ini sudah hangus. Unduh datanya SEKARANG.</p>
        <p className="mt-1">
          Jangan tutup atau memuat ulang halaman ini sebelum selesai mengunduh,
          karena data tidak bisa dibuka lagi. Pastikan file hasil unduhan
          tersimpan di perangkat Anda.
        </p>
      </div>

      <p className="text-center text-xs text-slate-400">
        Data {label} untuk {instansi}
      </p>

      {data.penduduk && (
        <Kartu
          judul="Data Penduduk Lengkap"
          ket={`${fmt(data.penduduk.length)} warga. Format Excel dipakai karena kolomnya banyak dan lebar.`}
        >
          <div className="mt-3">
            <TombolUnduh
              onKlik={() =>
                unduhTabelExcel({
                  header: HEADER_PENDUDUK,
                  baris: data.penduduk,
                  namaSheet: "Data Penduduk",
                  namaFile: berkas("data-penduduk", "xlsx"),
                  lebar: [18, 18, 26, 18, 14, 14, 14, 18, 30, 16, 8, 8, 16, 24, 18],
                })
              }
            >
              Unduh Data Penduduk (Excel)
            </TombolUnduh>
          </div>
          <Pratinjau header={HEADER_PENDUDUK} baris={data.penduduk} kolom={[2, 0, 5, 9]} />
        </Kartu>
      )}

      {data.keluarga && (
        <Kartu
          judul="Data Kartu Keluarga"
          ket={`${fmt(data.keluarga.length)} keluarga.`}
        >
          <div className="mt-3">
            <TombolUnduh
              onKlik={() =>
                unduhTabelExcel({
                  header: HEADER_KELUARGA,
                  baris: data.keluarga,
                  namaSheet: "Kartu Keluarga",
                  namaFile: berkas("data-kartu-keluarga", "xlsx"),
                  lebar: [20, 26, 34, 16, 8, 8, 16],
                })
              }
            >
              Unduh Data Kartu Keluarga (Excel)
            </TombolUnduh>
          </div>
          <Pratinjau header={HEADER_KELUARGA} baris={data.keluarga} kolom={[0, 1, 3, 6]} />
        </Kartu>
      )}

      {data.statistik && (
        <Kartu
          judul="Statistik Penduduk"
          ket="Angka ringkasan saja, tanpa data pribadi."
        >
          <div className="mt-3 flex flex-wrap gap-2">
            <TombolUnduh
              onKlik={() =>
                eksporExcel({
                  detail: data.statistik.detail,
                  perDusun: data.statistik.perDusun,
                  namaDesa: label,
                  wilayah: desa?.wilayah || "",
                })
              }
            >
              Unduh Excel
            </TombolUnduh>
            <TombolUnduh
              onKlik={() =>
                eksporPdf({
                  detail: data.statistik.detail,
                  perDusun: data.statistik.perDusun,
                  namaDesa: label,
                  wilayah: desa?.wilayah || "",
                })
              }
            >
              Unduh PDF
            </TombolUnduh>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {susunTabel(data.statistik).map((t) => (
              <div key={t.nama} className="overflow-hidden rounded-lg border border-slate-200">
                <p className="bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                  {t.judul}
                </p>
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-slate-100">
                    {t.rows.map((r, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1.5 text-slate-600">{r[0]}</td>
                        {r.slice(1).map((v, j) => (
                          <td key={j} className="px-3 py-1.5 text-right text-slate-500">
                            {fmt(v)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </Kartu>
      )}
    </div>
  );
}
