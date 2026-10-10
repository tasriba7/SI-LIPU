"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { buatTahun } from "./actions";

function Tombol() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light disabled:opacity-60"
    >
      {pending ? "Membuat..." : "Buat Tahun"}
    </button>
  );
}

export default function FormBuatTahun({ adaTahunLain }) {
  const router = useRouter();
  async function action(prev, formData) {
    const hasil = await buatTahun(prev, formData);
    if (hasil?.success) {
      router.push(`/dashboard/apbdes/${hasil.tahun}`);
      return {};
    }
    return hasil;
  }
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-700">Tambah tahun anggaran</p>
      <div className="flex flex-wrap items-center gap-3">
        <input
          name="tahun"
          type="number"
          min={2000}
          max={2100}
          required
          defaultValue={new Date().getFullYear()}
          className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
        />
        <Tombol />
      </div>
      {adaTahunLain && (
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <input type="checkbox" name="salin" defaultChecked className="h-4 w-4 rounded border-slate-300" />
          Salin struktur & anggaran dari tahun sebelumnya (realisasi dikosongkan) — tinggal disesuaikan
        </label>
      )}
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
