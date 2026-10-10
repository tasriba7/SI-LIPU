"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { simpanBerita } from "./actions";
import { KATEGORI_BERITA, tanggalInput } from "@/lib/berita";

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
      {pending ? "Menyimpan..." : edit ? "Simpan Perubahan" : "Simpan Berita"}
    </button>
  );
}

// Dipakai untuk TAMBAH (tanpa `berita`) dan EDIT (dengan `berita`).
export default function FormBerita({ berita = null }) {
  const router = useRouter();
  const edit = Boolean(berita);
  const [preview, setPreview] = useState(berita?.foto_url ?? null);
  const [hapusFoto, setHapusFoto] = useState(false);

  async function action(prev, formData) {
    const hasil = await simpanBerita(prev, formData);
    if (hasil?.success) {
      router.push("/dashboard/berita");
      router.refresh();
      return {};
    }
    return hasil;
  }
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-6">
      {edit && <input type="hidden" name="id" value={berita.id} />}
      {hapusFoto && <input type="hidden" name="hapus_foto" value="1" />}

      <div>
        <Label>Judul berita</Label>
        <input
          name="judul"
          required
          maxLength={200}
          defaultValue={berita?.judul ?? ""}
          placeholder="mis. Musyawarah Desa Bahas Pembangunan Jalan Usaha Tani"
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Kategori</Label>
          <select name="kategori" defaultValue={berita?.kategori ?? "umum"} className={inputClass}>
            {KATEGORI_BERITA.map((k) => (
              <option key={k.nilai} value={k.nilai}>
                {k.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Tanggal terbit (kosongkan = hari ini saat diterbitkan)</Label>
          <input type="date" name="tanggal" defaultValue={tanggalInput(berita?.tanggal_terbit)} className={inputClass} />
        </div>
      </div>

      <div>
        <Label>Foto (opsional)</Label>
        <p className="mb-2 text-xs text-slate-400">JPG/PNG/WEBP, maksimal 8MB. Foto lebar (landscape) paling bagus.</p>
        <input
          type="file"
          name="foto"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              setPreview(URL.createObjectURL(f));
              setHapusFoto(false);
            }
          }}
          className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-navy file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-navy-light"
        />
        {preview && (
          <div className="mt-3 flex items-end gap-3">
            <div className="aspect-[16/10] w-56 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="" className="h-full w-full object-cover" />
            </div>
            <button
              type="button"
              onClick={() => {
                setPreview(null);
                setHapusFoto(true);
              }}
              className="text-xs text-red-600 underline"
            >
              Hapus foto
            </button>
          </div>
        )}
      </div>

      <div>
        <Label>Ringkasan (opsional — kosong = diambil otomatis dari awal isi)</Label>
        <textarea name="ringkasan" rows={2} maxLength={300} defaultValue={berita?.ringkasan ?? ""} className={inputClass} />
      </div>

      <div>
        <Label>Isi berita</Label>
        <textarea
          name="isi"
          required
          rows={14}
          defaultValue={berita?.isi ?? ""}
          placeholder="Tulis isi berita. Pisahkan paragraf dengan satu baris kosong."
          className={inputClass}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="terbit" defaultChecked={berita?.terbit ?? true} className="h-4 w-4 rounded border-slate-300" />
        Terbitkan (hilangkan centang untuk menyimpan sebagai draf)
      </label>

      <div className="flex items-center gap-3">
        <TombolSimpan edit={edit} />
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      </div>
    </form>
  );
}
