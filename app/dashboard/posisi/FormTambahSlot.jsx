"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { tambahSlotPosisi } from "./actions";

function TombolTambah() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light disabled:opacity-60"
    >
      {pending ? "Menambah..." : "Tambah Slot"}
    </button>
  );
}

export default function FormTambahSlot() {
  const [state, formAction] = useActionState(tambahSlotPosisi, {});
  const [role, setRole] = useState("ketua_rt");

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4"
    >
      <div>
        <label className="mb-1 block text-xs text-slate-500">Role</label>
        <select
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
        >
          <option value="ketua_rt">Ketua RT</option>
          <option value="kadus">Kepala Dusun</option>
          <option value="kepala_desa">Kepala Desa</option>
        </select>
      </div>
      <div className="flex-1">
        {role === "kadus" ? (
          <>
            <label className="mb-1 block text-xs text-slate-500">
              Nama atau nomor dusun (mis. &quot;1&quot; atau &quot;Melati&quot;). Ini juga menjadi
              pilihan Dusun di data penduduk, jadi isi nama dusunnya saja, bukan jabatan.
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Dusun</span>
              <input
                type="text"
                name="wilayah"
                required
                maxLength={40}
                placeholder="1"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
              />
            </div>
          </>
        ) : (
          <>
            <label className="mb-1 block text-xs text-slate-500">
              Wilayah (mis. &quot;RT 01/RW 02&quot;, atau &quot;Desa&quot; untuk Kepala Desa)
            </label>
            <input
              type="text"
              name="wilayah"
              required
              placeholder={role === "kepala_desa" ? "Desa" : "RT 01/RW 02"}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
            />
          </>
        )}
      </div>
      <TombolTambah />
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
