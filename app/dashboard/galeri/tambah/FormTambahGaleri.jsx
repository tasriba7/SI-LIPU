"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { tambahGaleri } from "../actions";

function Label({ children }) {
  return (
    <label className="mb-1 block text-xs font-medium text-slate-500">
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy";

function TombolSimpan() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-navy px-5 py-2.5 text-sm font-medium text-white transition hover:bg-navy-light disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Simpan Foto"}
    </button>
  );
}

export default function FormTambahGaleri() {
  const router = useRouter();
  const [preview, setPreview] = useState(null);

  async function action(prevState, formData) {
    const hasil = await tambahGaleri(prevState, formData);
    if (hasil?.success) {
      router.push("/dashboard/galeri");
      router.refresh();
      return {};
    }
    return hasil;
  }

  const [state, formAction] = useActionState(action, {});

  function handleFotoChange(e) {
    const file = e.target.files?.[0];
    setPreview(file ? URL.createObjectURL(file) : null);
  }

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <Label>Foto kegiatan</Label>
        <p className="mb-2 text-xs text-slate-400">
          Format JPG/PNG/WEBP, maksimal 8MB.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            name="foto"
            required
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFotoChange}
            className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-navy file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-navy-light"
          />
        </div>
        {preview && (
          <div className="mt-3 aspect-[4/3] w-48 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="" className="h-full w-full object-cover" />
          </div>
        )}
      </div>

      <div>
        <Label>Judul kegiatan</Label>
        <input
          type="text"
          name="judul"
          required
          placeholder="mis. Gotong Royong Bersih Desa"
          className={inputClass}
        />
      </div>

      <div>
        <Label>Rincian kegiatan (opsional)</Label>
        <textarea
          name="deskripsi"
          rows={4}
          placeholder="Ceritakan sedikit tentang kegiatan ini — kapan, di mana, siapa saja yang terlibat, dst."
          className={inputClass}
        />
      </div>

      <div className="flex items-center gap-3">
        <TombolSimpan />
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      </div>
    </form>
  );
}
