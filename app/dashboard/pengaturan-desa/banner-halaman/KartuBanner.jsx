"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { simpanBannerHalaman } from "./actions";

function TombolSimpan() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white transition hover:bg-navy-light disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Simpan"}
    </button>
  );
}

export default function KartuBanner({ kunci, nama, href, gambarUrl }) {
  const [state, formAction] = useActionState(simpanBannerHalaman, {});
  const [preview, setPreview] = useState(gambarUrl || null);
  const [hapus, setHapus] = useState(false);

  function pilihFile(e) {
    const file = e.target.files?.[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
      setHapus(false);
    }
  }

  return (
    <form action={formAction} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <input type="hidden" name="kunci" value={kunci} />
      {hapus && <input type="hidden" name="hapus" value="1" />}

      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-slate-700">{nama}</p>
        <a href={href} target="_blank" rel="noreferrer" className="text-xs text-navy underline">
          Lihat halaman
        </a>
      </div>

      <div className="relative flex h-32 items-center justify-center overflow-hidden rounded-xl bg-navy-dark">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="text-xs text-white/50">Belum ada gambar</span>
        )}
        {preview && <div className="absolute inset-0 bg-navy-dark/45" />}
        {preview && (
          <span className="relative font-display text-lg font-bold text-white">{nama}</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          name="gambar"
          accept="image/jpeg,image/png,image/webp"
          onChange={pilihFile}
          className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
        />
        {preview && (
          <button
            type="button"
            onClick={() => {
              setPreview(null);
              setHapus(true);
            }}
            className="text-xs text-red-600 underline"
          >
            Hapus gambar
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <TombolSimpan />
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.success && <p className="text-sm text-emerald-600">{state.success}</p>}
      </div>
    </form>
  );
}
