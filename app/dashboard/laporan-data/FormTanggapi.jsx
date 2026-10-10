"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ubahStatusLaporan } from "./actions";
import { STATUS_LAPORAN, STATUS_LAPORAN_LABEL } from "@/lib/laporanData";

function Simpan() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Simpan"}
    </button>
  );
}

// Form kecil di tiap laporan: ubah status + catatan untuk arsip internal.
export default function FormTanggapi({ id, status, catatan }) {
  const [state, action] = useActionState(ubahStatusLaporan, {});

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-wrap items-center gap-2">
        <select
          name="status"
          defaultValue={status}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-navy"
        >
          {STATUS_LAPORAN.map((s) => (
            <option key={s} value={s}>
              {STATUS_LAPORAN_LABEL[s]}
            </option>
          ))}
        </select>
        <Simpan />
        {state?.success && <span className="text-xs text-emerald-600">Tersimpan</span>}
      </div>
      <textarea
        name="catatan_admin"
        defaultValue={catatan ?? ""}
        rows={2}
        maxLength={500}
        placeholder="Catatan admin (wajib kalau ditolak)"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
      />
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
