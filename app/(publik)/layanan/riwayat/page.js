"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { cariRiwayat, periksaTempatLahirRiwayat } from "./actions";
import VerifikasiTempatLahir from "@/components/VerifikasiTempatLahir";
import CopyButton from "@/components/CopyButton";
import { STATUS_LABELS, STATUS_BADGE_CLASS } from "@/lib/statusSurat";

function Tombol() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-navy py-2.5 font-medium text-white transition hover:bg-navy-light disabled:opacity-60"
    >
      {pending ? "Mencari..." : "Lihat Riwayat Saya"}
    </button>
  );
}

function tanggalId(iso) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export default function RiwayatPengajuanPage() {
  const [stAsli, formAction] = useActionState(cariRiwayat, {});
  // Hasil setelah tebak tempat lahir (terikat ke pencarian yang memulainya).
  const [lanjut, setLanjut] = useState(null); // { src, hasil }
  const [batal, setBatal] = useState(null); // { src, pesan }
  const state = useMemo(() => {
    if (lanjut && lanjut.src === stAsli) return lanjut.hasil;
    if (batal && batal.src === stAsli) return { error: batal.pesan };
    return stAsli;
  }, [stAsli, lanjut, batal]);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-center text-xl font-bold text-navy">Riwayat Pengajuan Saya</h1>
          <p className="mb-6 mt-1 text-center text-sm text-slate-500">
            Lupa kode tracking? Masukkan NIK dan tanggal lahir untuk melihat semua pengajuan Anda.
          </p>

          {!state?.verifikasi && (
          <form action={formAction} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-slate-600">NIK (16 digit)</label>
              <input
                type="text"
                name="nik"
                required
                maxLength={16}
                inputMode="numeric"
                pattern="\d{16}"
                autoComplete="off"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-navy"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-600">Tanggal Lahir</label>
              <input
                type="date"
                name="tanggal_lahir"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-navy"
              />
            </div>

            {state?.error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
            )}
            {state?.kosong && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">{state.pesan}</p>
            )}

            <Tombol />
          </form>
          )}

          {state?.verifikasi && (
            <VerifikasiTempatLahir
              opsi={state.verifikasi.opsi}
              sisaAwal={state.verifikasi.sisa}
              periksa={(pilihan) =>
                periksaTempatLahirRiwayat(state.nik, state.tanggal, state.verifikasi.tiket, pilihan)
              }
              onSukses={(r) => setLanjut({ src: stAsli, hasil: r })}
              onBatal={(pesan) => setBatal({ src: stAsli, pesan })}
            />
          )}

          {state?.riwayat && (
            <div className="mt-6 space-y-3">
              <p className="text-sm font-medium text-slate-600">
                {state.riwayat.length} pengajuan ditemukan
              </p>
              {state.riwayat.map((r) => (
                <div key={r.kode_tracking} className="space-y-2 rounded-xl border border-slate-200 p-4 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs tracking-wider text-slate-500">{r.kode_tracking}</span>
                    <CopyButton text={r.kode_tracking} label="Salin kode" />
                  </div>
                  <p className="font-semibold text-slate-800">{r.nama_layanan}</p>
                  <p className="text-xs text-slate-400">Diajukan {tanggalId(r.created_at)}</p>
                  <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[r.status]}`}>
                    {STATUS_LABELS[r.status]}
                  </span>
                  {r.nomor_surat && (
                    <p className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">
                      Surat sudah terbit, nomor{" "}
                      <span className="font-mono font-semibold">{r.nomor_surat}</span>. Silakan ambil di
                      kantor desa pada jam kerja.
                    </p>
                  )}
                  {r.catatan_admin && (
                    <p className="rounded-lg bg-slate-50 px-3 py-2 text-slate-600">{r.catatan_admin}</p>
                  )}
                </div>
              ))}
              <p className="text-xs text-slate-400">
                Pengaduan anonim tidak tampil di sini karena identitasnya memang tidak disimpan. Gunakan kode
                tracking yang Anda terima.
              </p>
            </div>
          )}

          <Link href="/layanan/cek" className="mt-6 block text-center text-xs text-slate-400 hover:text-slate-600">
            Punya kode tracking? Cek status di sini
          </Link>
          <Link href="/" className="mt-2 block text-center text-xs text-slate-400 hover:text-slate-600">
            Kembali ke beranda
          </Link>
        </div>
      </div>
    </main>
  );
}
