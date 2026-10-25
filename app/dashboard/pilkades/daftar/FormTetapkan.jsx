"use client";

import { useState } from "react";
import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { tetapkanDaftar } from "../actions";
import { IconKunci, Pesan, kolom, labelKolom } from "@/components/pilkades/UI";

const WARNA = {
  DPS: { kotak: "border-amber-300", kepala: "bg-amber-100 text-amber-950", tombol: "bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-300" },
  DPT: { kotak: "border-red-300", kepala: "bg-red-100 text-red-950", tombol: "bg-red-600 hover:bg-red-700 focus-visible:ring-red-300" },
};
const NAMA = { DPS: "Daftar Pemilih Sementara", DPT: "Daftar Pemilih Tetap" };
const ARTI = {
  DPS: "Daftar yang diumumkan lebih dulu agar warga bisa memeriksa namanya dan memberi tanggapan.",
  DPT: "Daftar final yang dipakai saat pemungutan suara. Tetapkan setelah tanggapan warga atas DPS selesai diperiksa.",
};

function Tombol({ jenis, siap }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending || !siap}
      className={`inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-bold text-white shadow-sm transition focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-40 ${WARNA[jenis].tombol}`}
    >
      {pending ? "Sedang menetapkan…" : `Ya, Tetapkan ${jenis} Sekarang`}
    </button>
  );
}

export default function FormTetapkan({ periodeId, jenis, jumlah, nonaktifAlasan, tautan }) {
  const [state, formAction] = useActionState(tetapkanDaftar, {});
  const [paham, setPaham] = useState(false);
  const w = WARNA[jenis];

  if (nonaktifAlasan) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <p className="flex items-center gap-2 text-base font-bold text-slate-700">
          <IconKunci className="h-5 w-5" /> Tetapkan {jenis} — belum bisa
        </p>
        <p className="mt-1 text-sm text-slate-600">{ARTI[jenis]}</p>
        <p className="mt-3 rounded-xl bg-white p-3 text-sm font-semibold text-slate-800">{nonaktifAlasan}</p>
        {tautan && (
          <Link href={tautan.href} className="mt-3 inline-block text-sm font-bold text-sky-800 underline">
            {tautan.label} →
          </Link>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className={`space-y-4 rounded-xl border bg-white p-5 shadow-sm ${w.kotak}`}>
      <input type="hidden" name="periode_id" value={periodeId} />
      <input type="hidden" name="jenis" value={jenis} />
      <div className={`-m-5 mb-0 rounded-t-2xl p-5 ${w.kepala}`}>
        <p className="text-lg font-extrabold">Tetapkan {jenis}</p>
        <p className="text-sm">{NAMA[jenis]}</p>
      </div>
      <p className="text-sm text-slate-700">{ARTI[jenis]}</p>

      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-900">
        <p>Yang akan masuk daftar: <b className="text-xl">{jumlah}</b> pemilih berstatus “Memenuhi syarat”.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelKolom}>
          Tanggal penetapan
          <input type="date" name="tanggal_penetapan" required className={`${kolom} mt-1 font-normal`} />
        </label>
        <label className={labelKolom}>
          Nomor berita acara <span className="font-normal text-slate-600">(boleh kosong)</span>
          <input name="nomor_berita_acara" maxLength={100} className={`${kolom} mt-1 font-normal`} />
        </label>
      </div>
      <label className={labelKolom}>
        Catatan <span className="font-normal text-slate-600">(boleh kosong)</span>
        <input name="catatan" maxLength={300} className={`${kolom} mt-1 font-normal`} />
      </label>

      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-bold text-red-900">⚠ Perhatian: tidak bisa dibatalkan</p>
        <p className="mt-1 text-sm text-red-950">
          Setelah ditetapkan, daftar ini disimpan tetap dan <b>tidak bisa diubah</b>. Bila ada kesalahan, panitia harus menetapkan versi baru.
        </p>
        <label className="mt-3 flex items-start gap-3 text-sm font-semibold text-red-950">
          <input
            type="checkbox"
            name="konfirmasi"
            value="ya"
            checked={paham}
            onChange={(e) => setPaham(e.target.checked)}
            className="mt-1 h-6 w-6 shrink-0"
          />
          Saya sudah memeriksa daftar dan mengerti bahwa daftar ini tidak bisa diubah.
        </label>
      </div>

      {state?.error && (
        <Pesan jenis="bahaya" judul="Belum berhasil">{state.error}</Pesan>
      )}
      <Tombol jenis={jenis} siap={paham} />
    </form>
  );
}
