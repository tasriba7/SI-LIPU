"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { kecilkanGambar } from "@/lib/kecilkanGambar";
import { tambahFotoHero, hapusFotoHero, geserFotoHero } from "./actions";

function TombolUnggah() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white transition hover:bg-navy-light disabled:opacity-60"
    >
      {pending ? "Memproses & mengunggah..." : "Unggah foto"}
    </button>
  );
}

export default function PengelolaFoto({ foto, maks }) {
  const [state, formAction] = useActionState(tambahFotoHero, {});
  const [dipilih, setDipilih] = useState([]);
  const inputRef = useRef(null);
  const penuh = foto.length >= maks;

  return (
    <div className="space-y-6">
      <form
        action={async (fd) => {
          // Perkecil dulu di browser (sisi terpanjang 3000px) supaya tajam & ringan.
          const asli = fd.getAll("foto").filter((x) => x && x.size > 0);
          fd.delete("foto");
          for (const x of asli) fd.append("foto", await kecilkanGambar(x));
          await formAction(fd);
          setDipilih([]);
          if (inputRef.current) inputRef.current.value = "";
        }}
        className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
      >
        <p className="text-sm font-semibold text-slate-700">
          Tambah foto{" "}
          <span className="font-normal text-slate-400">
            ({foto.length}/{maks} terpakai)
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            name="foto"
            multiple
            disabled={penuh}
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setDipilih(Array.from(e.target.files ?? []))}
            className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
          />
          <TombolUnggah />
        </div>
        {dipilih.length > 0 && (
          <p className="text-xs text-slate-500">{dipilih.length} foto dipilih, klik &quot;Unggah foto&quot; untuk menyimpan. Foto besar otomatis diperkecil agar tetap tajam dan cepat dimuat.</p>
        )}
        {penuh && <p className="text-xs text-amber-600">Sudah mencapai batas. Hapus foto lama untuk menambah.</p>}
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.success && <p className="text-sm text-emerald-600">{state.success}</p>}
      </form>

      {foto.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
          Belum ada foto. Beranda akan tampil dengan latar putih polos sampai foto ditambahkan.
        </p>
      ) : (
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {foto.map((f, i) => (
            <li key={f.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="relative aspect-video bg-navy-dark">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.gambar_url} alt={`Foto beranda ${i + 1}`} className="h-full w-full object-cover" />
                <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2.5 py-0.5 text-xs font-semibold text-white">
                  {i + 1}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 p-3">
                <div className="flex gap-1.5">
                  <form action={geserFotoHero}>
                    <input type="hidden" name="id" value={f.id} />
                    <input type="hidden" name="arah" value="naik" />
                    <button
                      type="submit"
                      disabled={i === 0}
                      aria-label="Geser ke depan"
                      className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                    >
                      ← Maju
                    </button>
                  </form>
                  <form action={geserFotoHero}>
                    <input type="hidden" name="id" value={f.id} />
                    <input type="hidden" name="arah" value="turun" />
                    <button
                      type="submit"
                      disabled={i === foto.length - 1}
                      aria-label="Geser ke belakang"
                      className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                    >
                      Mundur →
                    </button>
                  </form>
                </div>
                <form
                  action={hapusFotoHero}
                  onSubmit={(e) => {
                    if (!confirm("Hapus foto ini dari beranda?")) e.preventDefault();
                  }}
                >
                  <input type="hidden" name="id" value={f.id} />
                  <button type="submit" className="text-xs text-red-600 underline">
                    Hapus
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
