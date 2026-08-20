"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateStatusSurat } from "../actions";
import { STATUS_LABELS } from "@/lib/statusSurat";

function TombolSimpan() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white transition hover:bg-navy-light disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Simpan perubahan"}
    </button>
  );
}

export default function DetailSuratForm({ surat }) {
  const [state, formAction] = useActionState(updateStatusSurat, {});

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6"
    >
      <input type="hidden" name="id" value={surat.id} />

      <div>
        <label className="mb-1 block text-sm text-slate-600">Status</label>
        <select
          name="status"
          defaultValue={surat.status}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
        >
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm text-slate-600">
          Catatan untuk warga (opsional)
        </label>
        <textarea
          name="catatan_admin"
          defaultValue={surat.catatan_admin ?? ""}
          rows={3}
          placeholder='Mis. "Surat sudah bisa diambil di kantor desa."'
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
        />
        <p className="mt-1 text-xs text-slate-400">
          Catatan ini akan tampil ke warga saat mereka cek status pakai kode
          tracking.
        </p>
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-600">
          Tersimpan.
        </p>
      )}

      <TombolSimpan />
    </form>
  );
}
