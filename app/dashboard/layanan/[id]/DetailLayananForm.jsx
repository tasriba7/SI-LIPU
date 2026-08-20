"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateStatusPengajuanLayanan } from "../actions";
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

export default function DetailLayananForm({ pengajuan }) {
  const [state, formAction] = useActionState(updateStatusPengajuanLayanan, {});

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6"
    >
      <input type="hidden" name="id" value={pengajuan.id} />

      <div>
        <label className="mb-1 block text-sm text-slate-600">Status</label>
        <select
          name="status"
          defaultValue={pengajuan.status}
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
          defaultValue={pengajuan.catatan_admin ?? ""}
          rows={3}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
        />
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
