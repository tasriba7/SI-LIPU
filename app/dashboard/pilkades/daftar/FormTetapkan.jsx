"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { tetapkanDaftar } from "../actions";

function Tombol({ jenis }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light disabled:opacity-60"
    >
      {pending ? "Menyimpan arsip..." : `Tetapkan ${jenis}`}
    </button>
  );
}

export default function FormTetapkan({ periodeId, jenis, jumlah, nonaktifAlasan }) {
  const [state, formAction] = useActionState(tetapkanDaftar, {});
  const input = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy";

  if (nonaktifAlasan) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        <p className="font-medium text-slate-700">Tetapkan {jenis}</p>
        <p className="mt-1">{nonaktifAlasan}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <input type="hidden" name="periode_id" value={periodeId} />
      <input type="hidden" name="jenis" value={jenis} />
      <p className="text-sm font-medium text-slate-800">
        Tetapkan {jenis} <span className="font-normal text-slate-500">({jumlah} pemilih memenuhi syarat)</span>
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-slate-500">
          Tanggal penetapan
          <input type="date" name="tanggal_penetapan" required className={input} />
        </label>
        <label className="text-xs text-slate-500">
          Nomor berita acara (opsional)
          <input name="nomor_berita_acara" maxLength={100} className={input} />
        </label>
      </div>
      <label className="block text-xs text-slate-500">
        Catatan (opsional)
        <input name="catatan" maxLength={300} className={input} />
      </label>
      <label className="flex items-start gap-2 text-sm text-slate-600">
        <input type="checkbox" name="konfirmasi" value="ya" className="mt-1" />
        Saya mengerti daftar ini disalin sebagai arsip dan tidak bisa diubah. Koreksi dilakukan dengan menetapkan versi baru.
      </label>
      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      <Tombol jenis={jenis} />
    </form>
  );
}
