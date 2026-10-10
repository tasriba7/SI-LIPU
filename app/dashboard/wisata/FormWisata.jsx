"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { simpanWisata } from "./actions";
import { KATEGORI_WISATA } from "@/lib/wisata";

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
      {pending ? "Menyimpan..." : edit ? "Simpan Perubahan" : "Simpan Wisata"}
    </button>
  );
}

// Dipakai untuk TAMBAH (tanpa `wisata`) dan EDIT (dengan `wisata`).
export default function FormWisata({ wisata = null }) {
  const router = useRouter();
  const edit = Boolean(wisata);
  const [preview, setPreview] = useState(wisata?.foto_url ?? null);

  async function action(prev, formData) {
    const hasil = await simpanWisata(prev, formData);
    if (hasil?.success) {
      router.push("/dashboard/wisata");
      router.refresh();
      return {};
    }
    return hasil;
  }
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-6">
      {edit && <input type="hidden" name="id" value={wisata.id} />}

      <div>
        <Label>Foto sampul {edit ? "(kosongkan kalau tidak diganti)" : ""}</Label>
        <p className="mb-2 text-xs text-slate-400">
          JPG/PNG/WEBP, maksimal 8MB. Foto lebar (landscape) paling bagus.
        </p>
        <input
          type="file"
          name="foto"
          required={!edit}
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setPreview(URL.createObjectURL(f));
          }}
          className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-navy file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-navy-light"
        />
        {preview && (
          <div className="mt-3 aspect-[4/3] w-56 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="" className="h-full w-full object-cover" />
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
        <div>
          <Label>Nama wisata</Label>
          <input
            name="nama"
            required
            maxLength={120}
            defaultValue={wisata?.nama ?? ""}
            placeholder="mis. Pantai Tanjung Indah"
            className={inputClass}
          />
        </div>
        <div>
          <Label>Kategori</Label>
          <select name="kategori" defaultValue={wisata?.kategori ?? "alam"} className={inputClass}>
            {KATEGORI_WISATA.map((k) => (
              <option key={k.nilai} value={k.nilai}>
                {k.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Label>Deskripsi</Label>
        <textarea
          name="deskripsi"
          rows={6}
          maxLength={5000}
          defaultValue={wisata?.deskripsi ?? ""}
          placeholder="Ceritakan daya tarik, fasilitas, dan tips berkunjung. Pisahkan paragraf dengan satu baris kosong."
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Lokasi / alamat</Label>
          <input name="lokasi" maxLength={200} defaultValue={wisata?.lokasi ?? ""} placeholder="mis. Dusun II, 2 km dari kantor desa" className={inputClass} />
        </div>
        <div>
          <Label>Jam buka</Label>
          <input name="jam_buka" maxLength={200} defaultValue={wisata?.jam_buka ?? ""} placeholder="mis. Setiap hari 08.00–17.00" className={inputClass} />
        </div>
        <div>
          <Label>Tiket masuk</Label>
          <input name="tiket" maxLength={200} defaultValue={wisata?.tiket ?? ""} placeholder="mis. Rp5.000 atau Gratis" className={inputClass} />
        </div>
        <div>
          <Label>Kontak pengelola</Label>
          <input name="kontak" maxLength={200} defaultValue={wisata?.kontak ?? ""} placeholder="mis. Pak Budi — 0812xxxxxxx" className={inputClass} />
        </div>
      </div>

      <div>
        <Label>Tautan Google Maps (opsional)</Label>
        <input
          name="maps_url"
          type="url"
          maxLength={500}
          defaultValue={wisata?.maps_url ?? ""}
          placeholder="https://maps.app.goo.gl/..."
          className={inputClass}
        />
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="aktif" defaultChecked={wisata?.aktif ?? true} className="h-4 w-4 rounded border-slate-300" />
          Tampilkan di situs publik
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="unggulan" defaultChecked={wisata?.unggulan ?? false} className="h-4 w-4 rounded border-slate-300" />
          Jadikan unggulan (didahulukan di beranda)
        </label>
      </div>

      <div className="flex items-center gap-3">
        <TombolSimpan edit={edit} />
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      </div>
    </form>
  );
}
