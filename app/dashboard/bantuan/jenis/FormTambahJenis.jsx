"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { buatJenisBantuan } from "../actions";
import { KATEGORI_BANTUAN } from "@/lib/bantuan";

function TombolTambah() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light disabled:opacity-60"
    >
      {pending ? "Menambah..." : "Tambah Jenis"}
    </button>
  );
}

export default function FormTambahJenis() {
  const [state, formAction] = useActionState(buatJenisBantuan, {});
  const formRef = useRef(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state?.kunci, state?.success]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <label htmlFor="nama" className="mb-1 block text-xs text-slate-500">
          Nama bantuan baru
        </label>
        <input
          id="nama"
          name="nama"
          type="text"
          required
          minLength={3}
          maxLength={120}
          placeholder="Mis. Bantuan Alat Tangkap Ikan"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
        />
      </div>
      <div>
        <label htmlFor="kategori" className="mb-1 block text-xs text-slate-500">
          Kategori
        </label>
        <select
          id="kategori"
          name="kategori"
          defaultValue="lainnya"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
        >
          {KATEGORI_BANTUAN.map((k) => (
            <option key={k.nilai} value={k.nilai}>
              {k.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="penyelenggara" className="mb-1 block text-xs text-slate-500">
          Penyelenggara (opsional)
        </label>
        <input
          id="penyelenggara"
          name="penyelenggara"
          type="text"
          maxLength={120}
          placeholder="Mis. Dinas Sosial"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="deskripsi" className="mb-1 block text-xs text-slate-500">
          Deskripsi singkat (opsional)
        </label>
        <input
          id="deskripsi"
          name="deskripsi"
          type="text"
          maxLength={500}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
        />
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <TombolTambah />
        {state?.success && <span className="text-sm text-emerald-700">Jenis bantuan ditambahkan.</span>}
        {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}
