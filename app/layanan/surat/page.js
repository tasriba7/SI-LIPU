"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { ajukanSurat } from "./actions";
import { JENIS_SURAT } from "@/lib/jenisSurat";
import PublicHeader from "@/components/PublicHeader";

function TombolKirim() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-navy py-2.5 font-medium text-white transition hover:bg-navy-light disabled:opacity-60"
    >
      {pending ? "Mengirim..." : "Ajukan Surat"}
    </button>
  );
}

export default function PengajuanSuratPage() {
  const [state, formAction] = useActionState(ajukanSurat, {});

  if (state?.success) {
    return (
      <main className="min-h-screen bg-slate-50">
        <PublicHeader />
        <div className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-bold text-navy">Pengajuan terkirim</h1>
          <p className="mt-2 text-sm text-slate-500">
            Simpan kode tracking di bawah ini baik-baik — dipakai untuk cek
            status pengajuan Anda kapan saja.
          </p>
          <p className="mt-4 rounded-lg bg-slate-100 py-3 font-mono text-xl font-bold tracking-widest text-navy">
            {state.kode_tracking}
          </p>
          <Link
            href="/layanan/surat/cek"
            className="mt-6 inline-block text-sm font-medium text-navy underline"
          >
            Cek status sekarang &rarr;
          </Link>
          <br />
          <Link
            href="/"
            className="mt-3 inline-block text-xs text-slate-400 hover:text-slate-600"
          >
            Kembali ke beranda
          </Link>
        </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <PublicHeader />
      <div className="flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-navy">Pengajuan Surat Online</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500">
          Isi form di bawah — tidak perlu akun. Setelah terkirim, Anda akan
          dapat kode tracking untuk cek status pengajuan.
        </p>

        <form action={formAction} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-slate-600">
              Jenis surat
            </label>
            <select
              name="jenis_surat"
              required
              defaultValue=""
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-navy"
            >
              <option value="" disabled>
                Pilih jenis surat
              </option>
              {JENIS_SURAT.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-600">
              Nama lengkap
            </label>
            <input
              type="text"
              name="nama_pemohon"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-navy"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-600">
              NIK (16 digit)
            </label>
            <input
              type="text"
              name="nik"
              required
              maxLength={16}
              inputMode="numeric"
              pattern="\d{16}"
              title="NIK harus 16 digit angka"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-navy"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-600">
              Alamat
            </label>
            <textarea
              name="alamat"
              required
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-navy"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-600">
              No. HP / WhatsApp
            </label>
            <input
              type="tel"
              name="no_hp"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-navy"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-600">
              Keperluan
            </label>
            <textarea
              name="keperluan"
              required
              rows={2}
              placeholder="Untuk apa surat ini digunakan?"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-navy"
            />
          </div>

          {state?.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {state.error}
            </p>
          )}

          <TombolKirim />
        </form>

        <Link
          href="/layanan/surat/cek"
          className="mt-4 block text-center text-xs text-slate-400 hover:text-slate-600"
        >
          Sudah punya kode tracking? Cek status di sini
        </Link>
        <Link
          href="/"
          className="mt-2 block text-center text-xs text-slate-400 hover:text-slate-600"
        >
          Kembali ke beranda
        </Link>
      </div>
      </div>
    </main>
  );
}
