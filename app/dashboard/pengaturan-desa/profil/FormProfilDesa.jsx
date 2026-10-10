"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { simpanProfilDesa } from "./actions";
import { BATAS_PROFIL } from "@/lib/profilDesa";

function TombolSimpan() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-navy px-5 py-2.5 text-sm font-medium text-white transition hover:bg-navy-light disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Simpan Profil Desa"}
    </button>
  );
}

function Label({ children, hint }) {
  return (
    <label className="mb-1 block text-xs font-medium text-slate-500">
      {children}
      {hint && <span className="ml-1 font-normal text-slate-400">— {hint}</span>}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy";

export default function FormProfilDesa({ profil }) {
  const [state, formAction] = useActionState(simpanProfilDesa, {});

  return (
    <form action={formAction} className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-700">Sejarah Desa</h2>
        <div>
          <Label hint="pisahkan paragraf dengan baris kosong; panjang bebas">Sejarah desa</Label>
          <textarea
            name="profil_sejarah"
            rows={14}
            defaultValue={profil.profil_sejarah}
            placeholder="Ceritakan asal-usul nama desa, tahun berdiri, dan perkembangannya..."
            className={`${inputClass} min-h-[16rem] resize-y leading-relaxed`}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-700">Visi &amp; Misi</h2>
        <div>
          <Label>Visi</Label>
          <textarea
            name="profil_visi"
            rows={3}
            maxLength={BATAS_PROFIL.visi}
            defaultValue={profil.profil_visi}
            placeholder="mis. Terwujudnya desa yang mandiri, sejahtera, dan berbudaya."
            className={inputClass}
          />
        </div>
        <div>
          <Label hint="satu poin per baris, tanpa perlu nomor">Misi</Label>
          <textarea
            name="profil_misi"
            rows={6}
            maxLength={BATAS_PROFIL.misi}
            defaultValue={profil.profil_misi}
            placeholder={"Meningkatkan kualitas pelayanan publik\nMemperkuat perekonomian warga\nMenjaga kelestarian lingkungan"}
            className={inputClass}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-700">Wilayah</h2>
        <div>
          <Label hint="tulis beserta satuannya">Luas wilayah</Label>
          <input
            name="luas_wilayah"
            maxLength={BATAS_PROFIL.luas}
            defaultValue={profil.luas_wilayah}
            placeholder="mis. 12,5 km² atau 1.250 hektare"
            className={inputClass}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["batas_utara", "Batas utara"],
            ["batas_selatan", "Batas selatan"],
            ["batas_timur", "Batas timur"],
            ["batas_barat", "Batas barat"],
          ].map(([nama, label]) => (
            <div key={nama}>
              <Label>{label}</Label>
              <input
                name={nama}
                maxLength={BATAS_PROFIL.batas}
                defaultValue={profil[nama]}
                placeholder="mis. Desa Sumber Jaya"
                className={inputClass}
              />
            </div>
          ))}
        </div>
      </section>

      <p className="text-xs text-slate-400">
        Semua isian bersifat publik dan tampil di halaman Profil Desa. Jangan isi data pribadi
        warga. Bagian yang dikosongkan tidak akan ditampilkan.
      </p>

      <div className="flex items-center gap-3">
        <TombolSimpan />
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.success && <p className="text-sm text-emerald-600">Profil desa tersimpan.</p>}
      </div>
    </form>
  );
}
