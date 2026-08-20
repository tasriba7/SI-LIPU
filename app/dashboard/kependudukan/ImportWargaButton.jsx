"use client";

import { useEffect, useState, useActionState, useRef } from "react";
import { createPortal } from "react-dom";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { importWarga } from "./actions";
import { IconClose, IconUpload, IconDownload } from "@/components/icons";

// Alias header -> nama kolom di database, supaya file yang headernya sedikit
// beda (mis. tanpa tanda "*", huruf besar/kecil, atau nama singkat) tetap
// terbaca. Kunci di sini sudah dinormalisasi lewat normalisasiHeader().
const ALIAS_HEADER = {
  nik: "nik",
  "no kk": "no_kk",
  "nomor kk": "no_kk",
  no_kk: "no_kk",
  "nama lengkap": "nama_lengkap",
  nama: "nama_lengkap",
  "tempat lahir": "tempat_lahir",
  "tanggal lahir": "tanggal_lahir",
  "tgl lahir": "tanggal_lahir",
  "jenis kelamin": "jenis_kelamin",
  jk: "jenis_kelamin",
  "status kawin": "status_kawin",
  "status perkawinan": "status_kawin",
  "status dalam kk": "status_dalam_kk",
  alamat: "alamat",
  dusun: "dusun",
  rt: "rt",
  rw: "rw",
  "no hp": "no_hp",
  "nomor hp": "no_hp",
  no_hp: "no_hp",
  pekerjaan: "pekerjaan",
  agama: "agama",
};

function normalisasiHeader(h) {
  return String(h ?? "")
    .toLowerCase()
    .replace(/\*/g, "")
    .replace(/\./g, "")
    .replace(/_/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function barisKosong(baris) {
  return Object.values(baris).every((v) => v === null || v === undefined || String(v).trim() === "");
}

function TombolProses({ disabled }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light disabled:opacity-50"
    >
      {pending ? "Memproses..." : "Proses Impor"}
    </button>
  );
}

export default function ImportWargaButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [rows, setRows] = useState(null); // hasil parsing file
  const [namaFile, setNamaFile] = useState("");
  const [errorParse, setErrorParse] = useState("");
  const fileInputRef = useRef(null);
  const [state, formAction] = useActionState(importWarga, {});
  const [tampilkanHasil, setTampilkanHasil] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (state?.success) setTampilkanHasil(true);
  }, [state]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e) {
      if (e.key === "Escape") tutup();
    }
    document.addEventListener("keydown", handleKeyDown);
    const scrollSebelumnya = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = scrollSebelumnya;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (state?.success) {
      router.refresh();
    }
  }, [state, router]);

  function tutup() {
    setOpen(false);
    setRows(null);
    setNamaFile("");
    setErrorParse("");
    setTampilkanHasil(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setNamaFile(file.name);
    setErrorParse("");
    setRows(null);

    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array", cellDates: true });
      const namaSheet = wb.SheetNames.includes("Data Penduduk")
        ? "Data Penduduk"
        : wb.SheetNames[0];
      const sheet = wb.Sheets[namaSheet];
      const dataMentah = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
        raw: false,
        dateNF: "yyyy-mm-dd",
      });

      const dipetakan = dataMentah.map((baris) => {
        const hasil = {};
        for (const [header, nilai] of Object.entries(baris)) {
          const kunci = ALIAS_HEADER[normalisasiHeader(header)];
          if (kunci) hasil[kunci] = typeof nilai === "string" ? nilai.trim() : nilai;
        }
        return hasil;
      });

      const bersih = dipetakan.filter((b) => !barisKosong(b));

      if (bersih.length === 0) {
        setErrorParse(
          "Tidak ada baris data yang terbaca. Pastikan file memakai template dan diisi mulai baris 2."
        );
        return;
      }
      setRows(bersih);
    } catch (err) {
      setErrorParse("Gagal membaca file. Pastikan formatnya .xlsx, .xls, atau .csv.");
    }
  }

  if (!mounted) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
      >
        <IconUpload className="h-4 w-4" />
        Impor Data Penduduk
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
      >
        <IconUpload className="h-4 w-4" />
        Impor Data Penduduk
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 overflow-y-auto bg-navy-dark/60 backdrop-blur-sm"
            onClick={tutup}
          >
            <div className="flex min-h-screen items-center justify-center px-4 py-8">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="import-modal-title"
                className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={tutup}
                  aria-label="Tutup"
                  className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <IconClose className="h-5 w-5" />
                </button>

                <h2 id="import-modal-title" className="text-lg font-bold text-slate-800">
                  Impor Data Penduduk
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Unggah data warga sekaligus lewat file Excel, memakai format template
                  di bawah ini.
                </p>

                <a
                  href="/template-import-penduduk.xlsx"
                  download
                  className="mt-4 flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-navy hover:bg-slate-50 w-fit"
                >
                  <IconDownload className="h-4 w-4" />
                  Unduh Template Excel
                </a>

                {!tampilkanHasil && (
                  <form
                    action={formAction}
                    className="mt-5 space-y-3"
                    onSubmit={(e) => {
                      if (!rows || rows.length === 0) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <div>
                      <label className="mb-1 block text-sm text-slate-600">
                        Pilih file (.xlsx, .xls, atau .csv)
                      </label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFile}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-slate-200"
                      />
                    </div>

                    {errorParse && (
                      <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                        {errorParse}
                      </p>
                    )}

                    {rows && rows.length > 0 && !errorParse && (
                      <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                        {rows.length} baris siap diimpor dari "{namaFile}".
                      </p>
                    )}

                    <input type="hidden" name="rows" value={JSON.stringify(rows ?? [])} />

                    {state?.error && (
                      <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                        {state.error}
                      </p>
                    )}

                    <div className="flex items-center justify-end gap-3 pt-1">
                      <button
                        type="button"
                        onClick={tutup}
                        className="text-sm text-slate-500 hover:text-slate-700"
                      >
                        Batal
                      </button>
                      <TombolProses disabled={!rows || rows.length === 0} />
                    </div>
                  </form>
                )}

                {tampilkanHasil && state?.ringkasan && (
                  <div className="mt-5 space-y-3">
                    <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      <p>
                        Total baris diproses:{" "}
                        <span className="font-medium">{state.ringkasan.total}</span>
                      </p>
                      <p className="text-emerald-600">
                        Berhasil disimpan:{" "}
                        <span className="font-medium">{state.ringkasan.berhasil}</span>
                      </p>
                      {state.ringkasan.gagal > 0 && (
                        <p className="text-red-600">
                          Gagal: <span className="font-medium">{state.ringkasan.gagal}</span>
                        </p>
                      )}
                    </div>

                    {state.daftarGagal?.length > 0 && (
                      <div className="max-h-48 overflow-y-auto rounded-lg border border-red-100 bg-red-50 px-3 py-2">
                        <ul className="list-disc space-y-1 pl-4 text-xs text-red-600">
                          {state.daftarGagal.map((pesan, i) => (
                            <li key={i}>{pesan}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex justify-end gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setRows(null);
                          setNamaFile("");
                          setTampilkanHasil(false);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="text-sm text-slate-500 hover:text-slate-700"
                      >
                        Impor file lain
                      </button>
                      <button
                        type="button"
                        onClick={tutup}
                        className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light"
                      >
                        Selesai
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
