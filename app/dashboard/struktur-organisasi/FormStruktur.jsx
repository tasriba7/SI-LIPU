"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { simpanStruktur } from "./actions";

function Label({ children }) {
  return <label className="mb-1 block text-xs font-medium text-slate-500">{children}</label>;
}

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy";

function TombolSimpan({ edit }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-navy px-5 py-2.5 text-sm font-medium text-white transition hover:bg-navy-light disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : edit ? "Simpan Perubahan" : "Simpan"}
    </button>
  );
}

// Dipakai untuk TAMBAH (tanpa `item`) dan EDIT (dengan `item`).
// `pilihanAtasan` = [{ id, label }] — sudah disaring (tanpa diri sendiri & bawahannya).
export default function FormStruktur({ item = null, pilihanAtasan = [], atasanAwal = "" }) {
  const router = useRouter();
  const edit = Boolean(item);
  const [preview, setPreview] = useState(item?.foto_url ?? null);

  async function action(prev, formData) {
    const hasil = await simpanStruktur(prev, formData);
    if (hasil?.success) {
      router.push("/dashboard/struktur-organisasi");
      router.refresh();
      return {};
    }
    return hasil;
  }
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-6">
      {edit && <input type="hidden" name="id" value={item.id} />}

      <div>
        <Label>Foto {edit ? "(kosongkan kalau tidak diganti)" : "(opsional)"}</Label>
        <p className="mb-2 text-xs text-slate-400">
          JPG/PNG/WEBP, maksimal 5MB. Foto setengah badan dengan wajah di tengah paling bagus; di bagan
          akan dipotong bulat. Tanpa foto, bagan menampilkan inisial nama.
        </p>
        <div className="flex items-center gap-4">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <input
            type="file"
            name="foto"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setPreview(URL.createObjectURL(f));
            }}
            className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-navy file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-navy-light"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Nama</Label>
          <input
            name="nama"
            required
            maxLength={120}
            defaultValue={item?.nama ?? ""}
            placeholder="mis. Tasrib A. Abbas, S.AP."
            className={inputClass}
          />
        </div>
        <div>
          <Label>Jabatan</Label>
          <input
            name="jabatan"
            required
            maxLength={120}
            defaultValue={item?.jabatan ?? ""}
            placeholder="mis. Kepala Desa"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <Label>Atasan langsung</Label>
        <select name="atasan_id" defaultValue={item?.atasan_id ?? atasanAwal} className={inputClass}>
          <option value="">— Paling atas (Kepala Desa) —</option>
          {pilihanAtasan.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-400">
          Menentukan posisi di bagan. Contoh: Sekretaris Desa dan Kepala Dusun berada di bawah Kepala Desa.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="aktif" defaultChecked={item?.aktif ?? true} className="h-4 w-4 rounded border-slate-300" />
        Tampilkan di situs publik
      </label>

      <div className="flex items-center gap-3">
        <TombolSimpan edit={edit} />
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      </div>
    </form>
  );
}
