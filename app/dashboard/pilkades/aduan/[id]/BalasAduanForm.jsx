"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { balasAduanPilkades } from "../actions";

function Tombol() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-navy px-5 py-2 text-sm font-medium text-white transition hover:bg-navy-light disabled:opacity-60"
    >
      {pending ? "Mengirim..." : "Balas Aduan"}
    </button>
  );
}

export default function BalasAduanForm({ id }) {
  const [state, formAction] = useActionState(balasAduanPilkades, {});

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6"
    >
      <input type="hidden" name="id" value={id} />
      <div>
        <label htmlFor="balasan" className="mb-1 block text-sm font-medium text-slate-700">
          Balasan untuk warga
        </label>
        <textarea
          id="balasan"
          name="balasan"
          rows={4}
          maxLength={1000}
          required
          placeholder="Tulis tanggapan panitia atas aduan ini…"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
        />
        <p className="mt-1 text-xs text-slate-400">
          Balasan ini dapat dibaca warga saat cek status aduan. Setelah dibalas, aduan berstatus
          Diproses.
        </p>
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}
      {state?.success && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-600">
          Balasan terkirim. Aduan kini berstatus Diproses.
        </p>
      )}

      <Tombol />
    </form>
  );
}
