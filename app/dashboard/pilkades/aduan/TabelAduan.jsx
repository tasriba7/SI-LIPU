"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { hapusAduanPilkades, hapusSemuaAduanPilkades } from "./actions";

/**
 * Tabel aduan Pilkades untuk panitia: kotak centang (hanya baris "Selesai diproses"),
 * tombol Hapus untuk yang dipilih, dan Hapus semua. Selalu lewat dialog konfirmasi;
 * server & database memeriksa ulang (yang belum dibalas tidak pernah bisa dihapus).
 */
export default function TabelAduan({ rows, labelLihat, bolehHapus, totalBisaDihapus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dipilih, setDipilih] = useState(() => new Set());
  const [dialog, setDialog] = useState(null); // null | "pilihan" | "semua"
  const [hasil, setHasil] = useState(null);
  const semuaRef = useRef(null);
  const batalRef = useRef(null);

  const bisaDipilih = rows.filter((r) => r.bisaDihapus);

  useEffect(() => {
    setDipilih((prev) => {
      const ada = new Set(rows.map((r) => r.id));
      const sisa = [...prev].filter((id) => ada.has(id));
      return sisa.length === prev.size ? prev : new Set(sisa);
    });
  }, [rows]);

  const semuaTerpilih = bisaDipilih.length > 0 && dipilih.size === bisaDipilih.length;
  const sebagian = dipilih.size > 0 && !semuaTerpilih;
  useEffect(() => {
    if (semuaRef.current) semuaRef.current.indeterminate = sebagian;
  }, [sebagian]);

  useEffect(() => {
    if (!dialog) return;
    batalRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape" && !pending) setDialog(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialog, pending]);

  function toggle(id) {
    setDipilih((prev) => {
      const baru = new Set(prev);
      if (baru.has(id)) baru.delete(id);
      else baru.add(id);
      return baru;
    });
  }

  function jalankan() {
    const tipe = dialog;
    startTransition(async () => {
      const res =
        tipe === "semua" ? await hapusSemuaAduanPilkades() : await hapusAduanPilkades([...dipilih]);
      setDialog(null);
      if (res?.error) {
        setHasil({ jenis: "error", pesan: res.error });
        return;
      }
      setHasil({ jenis: "ok", pesan: `${res.jumlah} aduan dihapus.` });
      setDipilih(new Set());
      router.refresh();
    });
  }

  const jumlahKolom = 7 + (labelLihat ? 1 : 0) + (bolehHapus ? 1 : 0);

  return (
    <div className="space-y-3">
      {hasil && (
        <div
          role={hasil.jenis === "error" ? "alert" : "status"}
          className={`flex items-start justify-between gap-3 rounded-lg px-4 py-3 text-sm ${
            hasil.jenis === "error"
              ? "border border-red-200 bg-red-50 text-red-700"
              : "border border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          <span>{hasil.pesan}</span>
          <button type="button" onClick={() => setHasil(null)} className="shrink-0 text-xs font-medium underline">
            Tutup
          </button>
        </div>
      )}

      {bolehHapus && (dipilih.size > 0 || totalBisaDihapus > 0) && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-navy/20 bg-navy/5 px-4 py-2.5 text-sm">
          {dipilih.size > 0 ? (
            <>
              <span className="font-medium text-navy">{dipilih.size} dipilih</span>
              <button
                type="button"
                onClick={() => setDialog("pilihan")}
                className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
              >
                Hapus ({dipilih.size})
              </button>
              <button
                type="button"
                onClick={() => setDipilih(new Set())}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Batal pilih
              </button>
            </>
          ) : (
            <span className="text-slate-500">
              Aduan yang sudah Selesai diproses bisa dihapus. Centang untuk memilih.
            </span>
          )}
          {totalBisaDihapus > 0 && (
            <button
              type="button"
              onClick={() => setDialog("semua")}
              className="ml-auto rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
            >
              Hapus semua Selesai diproses ({totalBisaDihapus})
            </button>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
            <tr>
              {bolehHapus && (
                <th className="w-10 px-4 py-3">
                  <input
                    ref={semuaRef}
                    type="checkbox"
                    checked={semuaTerpilih}
                    onChange={() =>
                      setDipilih(semuaTerpilih ? new Set() : new Set(bisaDipilih.map((r) => r.id)))
                    }
                    disabled={bisaDipilih.length === 0}
                    aria-label="Pilih semua aduan Selesai diproses di daftar ini"
                    className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-navy disabled:cursor-not-allowed"
                  />
                </th>
              )}
              <th className="px-4 py-3 font-medium">Kode</th>
              <th className="px-4 py-3 font-medium">Jenis Layanan</th>
              <th className="px-4 py-3 font-medium">Pemohon</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Masuk</th>
              <th className="px-4 py-3 font-medium">Lama penanganan</th>
              <th className="px-4 py-3 font-medium">Ditangani oleh</th>
              {labelLihat && <th className="px-4 py-3 font-medium">Aksi</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id} className={dipilih.has(r.id) ? "bg-navy/5" : "hover:bg-slate-50"}>
                {bolehHapus && (
                  <td className="px-4 py-3">
                    {r.bisaDihapus && (
                      <input
                        type="checkbox"
                        checked={dipilih.has(r.id)}
                        onChange={() => toggle(r.id)}
                        aria-label={`Pilih aduan ${r.kode}`}
                        className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-navy"
                      />
                    )}
                  </td>
                )}
                <td className="px-4 py-3 font-mono text-slate-700">{r.kode}</td>
                <td className="px-4 py-3 text-slate-700">
                  {r.layanan}
                  {r.jenis && <span className="block text-xs text-slate-400">{r.jenis}</span>}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {r.anonim ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                      Anonim
                    </span>
                  ) : (
                    r.pemohon || "-"
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${r.badge}`}>{r.label}</span>
                </td>
                <td className="px-4 py-3 text-slate-400" title={r.masukLengkap}>
                  {r.masuk}
                </td>
                <td className="px-4 py-3 text-slate-600">{r.lama}</td>
                <td className="px-4 py-3 text-slate-500">{r.penanganan || "-"}</td>
                {labelLihat && (
                  <td className="px-4 py-3">
                    <Link
                      href={r.href}
                      className="whitespace-nowrap rounded-lg border border-navy/30 px-3 py-1.5 text-xs font-medium text-navy transition hover:bg-navy hover:text-white"
                    >
                      {labelLihat}
                    </Link>
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={jumlahKolom} className="px-4 py-10 text-center text-slate-400">
                  Belum ada data.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {dialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="judul-hapus"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 id="judul-hapus" className="text-base font-bold text-slate-800">
              {dialog === "semua"
                ? `Hapus semua ${totalBisaDihapus} aduan Selesai diproses?`
                : `Hapus ${dipilih.size} aduan terpilih?`}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Penghapusan bersifat <strong>permanen</strong>. Kode tracking aduan yang dihapus tidak
              bisa dicek warga lagi. Aduan yang belum dibalas (Diajukan) tidak ikut terhapus.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                ref={batalRef}
                type="button"
                disabled={pending}
                onClick={() => setDialog(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={jalankan}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {pending ? "Menghapus..." : "Ya, hapus permanen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
