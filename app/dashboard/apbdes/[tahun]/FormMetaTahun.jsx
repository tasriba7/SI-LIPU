"use client";

import { useActionState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { simpanMetaTahun, hapusTahun } from "../actions";

function Tombol() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Simpan"}
    </button>
  );
}

export default function FormMetaTahun({ meta, boleh }) {
  const router = useRouter();
  const [state, formAction] = useActionState(async (prev, fd) => {
    const hasil = await simpanMetaTahun(prev, fd);
    if (hasil?.success) router.refresh();
    return hasil;
  }, {});
  const [menghapus, mulaiHapus] = useTransition();

  function hapus() {
    if (!confirm(`Hapus APBDes tahun ${meta.tahun} beserta SEMUA rinciannya? Tindakan ini tidak bisa dibatalkan.`)) return;
    mulaiHapus(async () => {
      const hasil = await hapusTahun(meta.tahun);
      if (hasil?.error) alert(hasil.error);
      else router.push("/dashboard/apbdes");
    });
  }

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <input type="hidden" name="tahun" value={meta.tahun} />

      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input type="checkbox" name="terbit" defaultChecked={meta.terbit} disabled={!boleh} className="h-4 w-4 rounded border-slate-300" />
        Terbitkan ke publik (hilangkan centang = draf)
      </label>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Catatan untuk warga (opsional)</label>
        <textarea
          name="catatan"
          rows={3}
          maxLength={2000}
          disabled={!boleh}
          defaultValue={meta.catatan ?? ""}
          placeholder="mis. APBDes ini ditetapkan dengan Peraturan Desa Nomor ... Tahun ..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Dokumen APBDes / Perdes (PDF, maks. 8MB, opsional)</label>
        {meta.dokumen_url && (
          <div className="mb-2 flex flex-wrap items-center gap-4 text-xs">
            <a href={meta.dokumen_url} target="_blank" rel="noreferrer" className="text-navy underline">
              Lihat dokumen saat ini
            </a>
            {boleh && (
              <label className="flex items-center gap-1.5 text-red-600">
                <input type="checkbox" name="hapus_dokumen" className="h-3.5 w-3.5" />
                Hapus dokumen
              </label>
            )}
          </div>
        )}
        {boleh && (
          <input
            type="file"
            name="dokumen"
            accept="application/pdf"
            className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
          />
        )}
      </div>

      {boleh && (
        <div className="flex flex-wrap items-center gap-3">
          <Tombol />
          <button
            type="button"
            onClick={hapus}
            disabled={menghapus}
            className="text-xs font-medium text-red-500 hover:underline disabled:opacity-50"
          >
            {menghapus ? "Menghapus..." : `Hapus tahun ${meta.tahun}`}
          </button>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          {state?.success && <p className="text-sm text-emerald-600">{state.success}</p>}
        </div>
      )}
    </form>
  );
}
