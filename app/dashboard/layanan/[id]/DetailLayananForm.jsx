"use client";

import { useActionState, useRef } from "react";
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
  const statusRef = useRef(null);
  const catatanRef = useRef(null);

  // Template singkat supaya petugas tidak mengetik berulang.
  const TEMPLATE = {
    diproses: "Pengajuan Anda sedang kami proses.",
    selesai: "Pengajuan selesai. Silakan ambil dokumen di kantor desa pada jam kerja.",
    ditolak: "Pengajuan ditolak karena: ",
  };
  function pilih(s) {
    statusRef.current.value = s;
    if (!catatanRef.current.value.trim()) catatanRef.current.value = TEMPLATE[s] ?? "";
    catatanRef.current.focus();
  }

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6"
    >
      <input type="hidden" name="id" value={pengajuan.id} />

      <div className="flex flex-wrap gap-2">
        <span className="self-center text-xs text-slate-400">Pilihan cepat:</span>
        {["diproses", "selesai", "ditolak"].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => pilih(s)}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-navy hover:text-navy"
          >
            {s === "diproses" ? "Mulai proses" : s === "selesai" ? "Tandai selesai" : "Tolak"}
          </button>
        ))}
      </div>

      <div>
        <label className="mb-1 block text-sm text-slate-600">Status</label>
        <select
          ref={statusRef}
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
          ref={catatanRef}
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
