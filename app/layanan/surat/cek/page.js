"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { cekStatusSurat } from "./actions";
import { STATUS_LABELS, STATUS_BADGE_CLASS } from "@/lib/statusSurat";
import PublicHeader from "@/components/PublicHeader";

function TombolCek() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-navy py-2.5 font-medium text-white transition hover:bg-navy-light disabled:opacity-60"
    >
      {pending ? "Memeriksa..." : "Cek Status"}
    </button>
  );
}

export default function CekStatusSuratPage() {
  const [state, formAction] = useFormState(cekStatusSurat, {});

  return (
    <main className="min-h-screen bg-slate-50">
      <PublicHeader />
      <div className="flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-center text-xl font-bold text-navy">
          Cek Status Pengajuan Surat
        </h1>
        <p className="mb-6 mt-1 text-center text-sm text-slate-500">
          Masukkan kode tracking yang Anda terima saat mengajukan surat.
        </p>

        <form action={formAction} className="space-y-4">
          <input
            type="text"
            name="kode_tracking"
            required
            placeholder="Mis. SRT-AB12CD"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-center font-mono uppercase tracking-widest outline-none focus:border-navy"
          />

          {state?.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {state.error}
            </p>
          )}

          <TombolCek />
        </form>

        {state?.result && (
          <div className="mt-6 space-y-2 rounded-xl border border-slate-200 p-4 text-sm">
            <p className="font-mono text-xs text-slate-400">
              {state.result.kode_tracking}
            </p>
            <p className="font-semibold text-slate-800">
              {state.result.jenis_surat}
            </p>
            <p className="text-slate-500">
              Atas nama {state.result.nama_pemohon}
            </p>
            <span
              className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                STATUS_BADGE_CLASS[state.result.status]
              }`}
            >
              {STATUS_LABELS[state.result.status]}
            </span>
            {state.result.catatan_admin && (
              <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-slate-600">
                {state.result.catatan_admin}
              </p>
            )}
          </div>
        )}

        <Link
          href="/layanan/surat"
          className="mt-6 block text-center text-xs text-slate-400 hover:text-slate-600"
        >
          Belum pernah mengajukan? Ajukan surat di sini
        </Link>
        <Link
          href="/"
          className="mt-2 block text-center text-xs text-slate-400 hover:text-slate-600"
        >
          Kembali ke beranda
        </Link>
      </div>
      </div>
    </main>
  );
}
