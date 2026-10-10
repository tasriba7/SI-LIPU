"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { simpanItem, hapusItem } from "../actions";
import { persen, rupiah } from "@/lib/apbdes";

const input = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy";

function Simpan({ teks }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : teks}
    </button>
  );
}

// Form tambah/ubah satu baris rincian. `item` null = tambah baru.
function FormItem({ tahun, jenis, item, daftarKelompok, onSelesai }) {
  const router = useRouter();
  const [state, formAction] = useActionState(async (prev, fd) => {
    const hasil = await simpanItem(prev, fd);
    if (hasil?.success) {
      router.refresh();
      onSelesai?.();
    }
    return hasil;
  }, {});
  const listId = `kelompok-${jenis}`;

  return (
    <form action={formAction} className="space-y-3">
      {item && <input type="hidden" name="id" value={item.id} />}
      <input type="hidden" name="tahun" value={tahun} />
      <input type="hidden" name="jenis" value={jenis} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Kelompok / bidang (opsional)</label>
          <input
            name="kelompok"
            list={listId}
            maxLength={150}
            defaultValue={item?.kelompok ?? ""}
            placeholder="mis. Bidang Pembangunan Desa"
            className={input}
          />
          <datalist id={listId}>
            {daftarKelompok.map((k) => (
              <option key={k} value={k} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Uraian</label>
          <input name="uraian" required maxLength={250} defaultValue={item?.uraian ?? ""} placeholder="mis. Dana Desa" className={input} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Anggaran (Rp)</label>
          <input name="anggaran" inputMode="numeric" required defaultValue={item?.anggaran ?? ""} placeholder="mis. 850000000" className={input} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Realisasi (Rp)</label>
          <input name="realisasi" inputMode="numeric" defaultValue={item?.realisasi ?? 0} placeholder="0" className={input} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Simpan teks={item ? "Simpan Perubahan" : "Tambah Rincian"} />
        {item && (
          <button type="button" onClick={onSelesai} className="text-sm text-slate-500 hover:underline">
            Batal
          </button>
        )}
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      </div>
    </form>
  );
}

function BarisItem({ item, tahun, daftarKelompok, boleh }) {
  const router = useRouter();
  const [edit, setEdit] = useState(false);
  const [pending, mulai] = useTransition();

  if (edit) {
    return (
      <div className="bg-slate-50 p-4">
        <FormItem tahun={tahun} jenis={item.jenis} item={item} daftarKelompok={daftarKelompok} onSelesai={() => setEdit(false)} />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
      <div className="min-w-0 flex-1 basis-56">
        <p className="text-sm font-medium text-slate-800">{item.uraian}</p>
        {item.kelompok && <p className="text-xs text-slate-400">{item.kelompok}</p>}
      </div>
      <div className="text-right text-xs tabular-nums text-slate-600">
        <p>Anggaran {rupiah(item.anggaran)}</p>
        <p className="text-slate-400">
          Realisasi {rupiah(item.realisasi)} ({persen(item.realisasi, item.anggaran).toLocaleString("id-ID")}%)
        </p>
      </div>
      {boleh && (
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setEdit(true)} className="text-xs font-medium text-navy hover:underline">
            Edit
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirm(`Hapus rincian "${item.uraian}"?`)) return;
              mulai(async () => {
                const hasil = await hapusItem(item.id, tahun);
                if (hasil?.error) alert(hasil.error);
                else router.refresh();
              });
            }}
            className="text-xs font-medium text-red-500 hover:underline disabled:opacity-50"
          >
            {pending ? "..." : "Hapus"}
          </button>
        </div>
      )}
    </div>
  );
}

// Satu bagian per jenis: daftar rincian + form tambah (lipat).
export default function PengelolaRincian({ tahun, jenis, label, contoh, items, total, boleh }) {
  const daftarKelompok = [...new Set(items.map((i) => i.kelompok).filter(Boolean))];

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
        <h2 className="font-semibold text-slate-800">{label}</h2>
        <p className="text-xs text-slate-500">
          Total anggaran <span className="font-semibold text-navy">{rupiah(total.anggaran)}</span> · realisasi{" "}
          {rupiah(total.realisasi)}
        </p>
      </div>

      {items.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-400">Belum ada rincian.</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map((it) => (
            <BarisItem key={it.id} item={it} tahun={tahun} daftarKelompok={daftarKelompok} boleh={boleh} />
          ))}
        </div>
      )}

      {boleh && (
        <details className="border-t border-slate-100">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-navy hover:bg-slate-50">
            + Tambah rincian {label.toLowerCase()}
          </summary>
          <div className="space-y-2 border-t border-slate-100 p-4">
            <p className="text-xs text-slate-400">Contoh: {contoh}</p>
            <FormItem tahun={tahun} jenis={jenis} item={null} daftarKelompok={daftarKelompok} />
          </div>
        </details>
      )}
    </section>
  );
}
