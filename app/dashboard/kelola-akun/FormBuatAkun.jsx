"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { buatAkunStaf } from "./actions";
import { ROLE_BISA_DIBUAT_ADMIN, ROLE_LABELS } from "@/lib/roles";
import CopyButton from "@/components/CopyButton";

function TombolBuat() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light disabled:opacity-60"
    >
      {pending ? "Membuat..." : "Buat Akun"}
    </button>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy";

export default function FormBuatAkun() {
  const [state, formAction] = useActionState(buatAkunStaf, {});
  const [mode, setMode] = useState("acak");

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-bold text-slate-800">Buat akun staf baru</h2>
      <p className="mb-3 mt-1 text-xs text-slate-500">
        Untuk Kepala Desa, Sekretaris Desa, Kaur, Kasi, atau Administrator lain.
        Akun Kepala Desa bersifat hanya lihat. Kadus &amp; Ketua RT dibuat lewat
        Slot Posisi + Pendaftaran Akun.
      </p>

      <form action={formAction} className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-slate-500">Nama lengkap</label>
          <input name="nama" required className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Email (untuk login)</label>
          <input name="email" type="email" required className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Role</label>
          <select name="role" defaultValue="kepala_desa" className={inputClass}>
            {ROLE_BISA_DIBUAT_ADMIN.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">
            Jabatan (opsional, mis. &quot;Kaur Keuangan&quot;)
          </label>
          <input name="jabatan" className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Password</label>
          <select
            name="mode"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className={inputClass}
          >
            <option value="acak">Buat acak otomatis</option>
            <option value="manual">Isi sendiri</option>
          </select>
        </div>
        {mode === "manual" && (
          <div>
            <label className="mb-1 block text-xs text-slate-500">Password (min. 6 karakter)</label>
            <input name="password_manual" type="text" minLength={6} className={inputClass} />
          </div>
        )}
        <div className="md:col-span-2">
          <TombolBuat />
        </div>
      </form>

      {state?.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
      {state?.success && (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <p>
            Akun dibuat untuk <strong>{state.email}</strong>. Catat password ini,
            tidak akan ditampilkan lagi:
          </p>
          <p className="mt-1 flex items-center gap-2">
            <code className="rounded bg-white px-2 py-1">{state.password}</code>
            <CopyButton text={state.password} />
          </p>
        </div>
      )}
    </section>
  );
}
