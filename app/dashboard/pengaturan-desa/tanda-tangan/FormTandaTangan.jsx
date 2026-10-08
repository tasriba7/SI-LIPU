"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { simpanTandaTangan } from "./actions";

function Simpan() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending}
      className="rounded-lg bg-navy px-5 py-2.5 text-sm font-medium text-white hover:bg-navy-light disabled:opacity-60">
      {pending ? "Menyimpan..." : "Simpan"}
    </button>
  );
}

function Baris({ nama, judul, bantuan, url }) {
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 p-4">
      <p className="text-sm font-semibold text-slate-700">{judul}</p>
      <p className="text-xs text-slate-400">{bantuan}</p>
      {url && (
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={judul} className="h-20 rounded border border-slate-200 bg-white object-contain p-1" />
          <label className="flex items-center gap-2 text-xs text-red-600">
            <input type="checkbox" name={`hapus_${nama}`} value="1" /> Hapus gambar ini
          </label>
        </div>
      )}
      <input type="file" name={nama} accept="image/png,image/jpeg,image/webp"
        className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm" />
    </div>
  );
}

export default function FormTandaTangan({ berkas }) {
  const [state, formAction] = useActionState(simpanTandaTangan, {});
  return (
    <form action={formAction} className="space-y-4">
      <Baris nama="ttd_kades" judul="Tanda tangan Kepala Desa"
        bantuan="PNG berlatar transparan paling bagus. Maks. 2MB." url={berkas.ttdKades} />
      <Baris nama="ttd_sekdes" judul="Tanda tangan Sekretaris Desa"
        bantuan="Dipakai bila surat ditandatangani a.n. Kepala Desa." url={berkas.ttdSekdes} />
      <Baris nama="stempel" judul="Stempel desa"
        bantuan="PNG berlatar transparan. Dicetak sedikit menimpa tanda tangan." url={berkas.stempel} />
      {state?.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
      {state?.success && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">Tersimpan.</p>}
      <Simpan />
    </form>
  );
}
