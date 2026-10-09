"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { STATUS_LABELS, STATUS_BADGE_CLASS } from "@/lib/statusSurat";
import { resetPengajuanLayanan, hapusPengajuanLayanan } from "./actions";

const MAKS_DAFTAR_DIALOG = 5;

/**
 * Tabel daftar pengajuan layanan + pilih banyak (kotak centang).
 *  - Reset  : pengajuan yang SUDAH diproses -> kembali "Diajukan".
 *  - Hapus  : pengajuan yang BELUM diproses ("Diajukan"), hanya admin.
 * Keduanya selalu lewat dialog konfirmasi. Server memeriksa ulang semuanya.
 */
export default function TabelPengajuan({ rows, bolehUbah, bolehHapus, pesanKosong }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dipilih, setDipilih] = useState(() => new Set());
  const [dialog, setDialog] = useState(null); // null | "reset" | "hapus"
  const [hasil, setHasil] = useState(null); // { jenis: "ok" | "error", pesan }
  const semuaRef = useRef(null);
  const batalRef = useRef(null);

  // Buang pilihan untuk baris yang sudah tidak ada (setelah refresh/filter).
  useEffect(() => {
    setDipilih((prev) => {
      const ada = new Set(rows.map((r) => r.id));
      const sisa = [...prev].filter((id) => ada.has(id));
      return sisa.length === prev.size ? prev : new Set(sisa);
    });
  }, [rows]);

  const terpilih = rows.filter((r) => dipilih.has(r.id));
  const bisaDireset = terpilih.filter((r) => r.status !== "diajukan");
  const bisaDihapus = terpilih.filter((r) => r.status === "diajukan");

  const semuaTerpilih = rows.length > 0 && terpilih.length === rows.length;
  const sebagian = terpilih.length > 0 && !semuaTerpilih;

  useEffect(() => {
    if (semuaRef.current) semuaRef.current.indeterminate = sebagian;
  }, [sebagian]);

  // Dialog: Esc menutup (kecuali sedang memproses), fokus awal ke "Batal" (aman).
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

  function toggleSemua() {
    setDipilih(semuaTerpilih ? new Set() : new Set(rows.map((r) => r.id)));
  }

  const target = dialog === "reset" ? bisaDireset : bisaDihapus;
  const dilewatiDialog = terpilih.length - target.length;

  function jalankan() {
    const tipe = dialog;
    const ids = target.map((r) => r.id);
    startTransition(async () => {
      const res =
        tipe === "reset" ? await resetPengajuanLayanan(ids) : await hapusPengajuanLayanan(ids);
      setDialog(null);
      if (res?.error) {
        setHasil({ jenis: "error", pesan: res.error });
        return;
      }
      let pesan =
        tipe === "reset"
          ? `${res.jumlah} pengajuan dikembalikan ke status Diajukan.`
          : `${res.jumlah} pengajuan dihapus.`;
      if (res.bersuratDilewati > 0) {
        pesan += ` ${res.bersuratDilewati} dilewati karena sudah memiliki surat terbit.`;
      }
      setHasil({ jenis: "ok", pesan });
      setDipilih(new Set());
      router.refresh();
    });
  }

  const jumlahKolom = bolehUbah ? 7 : 6;

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
          <button
            type="button"
            onClick={() => setHasil(null)}
            className="shrink-0 text-xs font-medium underline"
          >
            Tutup
          </button>
        </div>
      )}

      {bolehUbah && terpilih.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-navy/20 bg-navy/5 px-4 py-2.5 text-sm">
          <span className="font-medium text-navy">{terpilih.length} dipilih</span>
          <span className="mx-1 text-slate-300">|</span>
          {bisaDireset.length > 0 && (
            <button
              type="button"
              onClick={() => setDialog("reset")}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-navy hover:text-navy"
            >
              Reset ke Diajukan ({bisaDireset.length})
            </button>
          )}
          {bolehHapus && bisaDihapus.length > 0 && (
            <button
              type="button"
              onClick={() => setDialog("hapus")}
              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
            >
              Hapus ({bisaDihapus.length})
            </button>
          )}
          <button
            type="button"
            onClick={() => setDipilih(new Set())}
            className="ml-auto text-xs text-slate-500 hover:text-slate-700"
          >
            Batal pilih
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
            <tr>
              {bolehUbah && (
                <th className="w-10 px-4 py-3">
                  <input
                    ref={semuaRef}
                    type="checkbox"
                    checked={semuaTerpilih}
                    onChange={toggleSemua}
                    disabled={rows.length === 0}
                    aria-label="Pilih semua pengajuan di daftar ini"
                    className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-navy"
                  />
                </th>
              )}
              <th className="px-4 py-3 font-medium">Kode</th>
              <th className="px-4 py-3 font-medium">Jenis Layanan</th>
              <th className="px-4 py-3 font-medium">Pemohon</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Masuk</th>
              <th className="px-4 py-3 font-medium">Hubungi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr
                key={row.id}
                className={dipilih.has(row.id) ? "bg-navy/5" : "hover:bg-slate-50"}
              >
                {bolehUbah && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={dipilih.has(row.id)}
                      onChange={() => toggle(row.id)}
                      aria-label={`Pilih pengajuan ${row.kode}`}
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-navy"
                    />
                  </td>
                )}
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/layanan/${row.id}`}
                    className="font-mono text-navy hover:underline"
                  >
                    {row.kode}
                  </Link>
                  {row.status === "diajukan" && (
                    <span className="ml-2 rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-semibold text-navy">
                      Baru
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-700">{row.layanan}</td>
                <td className="px-4 py-3 text-slate-700">
                  {row.anonim ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                      Anonim
                    </span>
                  ) : (
                    row.nama
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[row.status]}`}
                  >
                    {STATUS_LABELS[row.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400">
                  <span title={row.masukLengkap}>{row.masuk}</span>
                </td>
                <td className="px-4 py-3">
                  {row.wa ? (
                    <a
                      href={row.wa}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-emerald-600 hover:underline"
                    >
                      WhatsApp
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={jumlahKolom} className="px-4 py-10 text-center text-slate-400">
                  {pesanKosong}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {dialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !pending) setDialog(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="judul-dialog-massal"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 id="judul-dialog-massal" className="text-base font-bold text-slate-800">
              {dialog === "reset"
                ? `Reset ${target.length} pengajuan?`
                : `Hapus ${target.length} pengajuan?`}
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              {dialog === "reset" ? (
                <>
                  Status akan kembali menjadi <strong>Diajukan</strong>. Catatan untuk warga dan
                  nama petugas pemroses dikosongkan. Surat yang sudah terbit tetap tersimpan di
                  menu Surat Terbit.
                </>
              ) : (
                <>
                  Pengajuan akan <strong>dihapus permanen</strong> dan tidak bisa dikembalikan.
                  Warga tidak akan bisa lagi mengecek statusnya dengan kode tracking.
                </>
              )}
            </p>

            <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              {target.slice(0, MAKS_DAFTAR_DIALOG).map((r) => (
                <li key={r.id} className="flex justify-between gap-3">
                  <span className="font-mono">{r.kode}</span>
                  <span className="truncate">{r.anonim ? "Anonim" : r.nama}</span>
                </li>
              ))}
              {target.length > MAKS_DAFTAR_DIALOG && (
                <li className="text-slate-400">
                  dan {target.length - MAKS_DAFTAR_DIALOG} lainnya
                </li>
              )}
            </ul>

            {dilewatiDialog > 0 && (
              <p className="mt-2 text-xs text-amber-700">
                {dilewatiDialog} pengajuan terpilih lainnya dilewati karena{" "}
                {dialog === "reset" ? "belum diproses" : "sudah diproses"}.
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                ref={batalRef}
                type="button"
                onClick={() => setDialog(null)}
                disabled={pending}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={jalankan}
                disabled={pending}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-60 ${
                  dialog === "hapus" ? "bg-red-600 hover:bg-red-700" : "bg-navy hover:bg-navy-light"
                }`}
              >
                {pending
                  ? "Memproses..."
                  : dialog === "reset"
                    ? "Ya, reset"
                    : "Ya, hapus permanen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
