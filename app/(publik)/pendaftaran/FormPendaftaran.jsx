"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { daftarPosisi } from "./actions";

function TombolDaftar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-navy py-2.5 font-medium text-white transition hover:bg-navy-light disabled:opacity-60"
    >
      {pending ? "Mengirim..." : "Kirim Pendaftaran"}
    </button>
  );
}

export default function FormPendaftaran({ slotKosong }) {
  const [state, formAction] = useActionState(daftarPosisi, {});

  if (state?.success) {
    return (
      <div className="text-center">
        <h2 className="text-lg font-bold text-navy">Pendaftaran terkirim</h2>
        <p className="mt-2 text-sm text-slate-500">
          Pendaftaran Anda sedang menunggu persetujuan admin desa. Anda akan
          dihubungi lewat No. HP yang didaftarkan setelah disetujui.
        </p>
        <Link href="/" className="mt-4 inline-block text-sm text-navy underline">
          Kembali ke beranda
        </Link>
      </div>
    );
  }

  if (slotKosong.length === 0) {
    return (
      <p className="rounded-lg bg-amber-50 px-3 py-3 text-sm text-amber-700">
        Semua slot Kadus & Ketua RT saat ini sudah terisi. Kalau merasa ada
        yang keliru, hubungi admin desa.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm text-slate-600">Posisi & wilayah</label>
        <select
          name="posisi_id"
          required
          defaultValue=""
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-navy"
        >
          <option value="" disabled>
            Pilih posisi & wilayah
          </option>
          {slotKosong.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm text-slate-600">Nama lengkap</label>
        <input
          type="text"
          name="nama_lengkap"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-navy"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-slate-600">NIK (16 digit)</label>
        <input
          type="text"
          name="nik"
          required
          maxLength={16}
          inputMode="numeric"
          pattern="\d{16}"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-navy"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-slate-600">No. HP / WhatsApp</label>
        <input
          type="tel"
          name="no_hp"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-navy"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-slate-600">Email (untuk akun login)</label>
        <input
          type="email"
          name="email"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-navy"
        />
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}

      <TombolDaftar />

      <Link href="/" className="block text-center text-xs text-slate-400 hover:text-slate-600">
        Kembali ke beranda
      </Link>
    </form>
  );
}
