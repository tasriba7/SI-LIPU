"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  daftarPosisi,
  cariWargaUntukPendaftaran,
  konfirmasiWargaUntukPendaftaran,
} from "./actions";

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

function TombolCari() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-navy py-2.5 font-medium text-white transition hover:bg-navy-light disabled:opacity-60"
    >
      {pending ? "Mencari..." : "Cari Data Saya"}
    </button>
  );
}

export default function FormPendaftaran({ slotKosong }) {
  const [state, formAction] = useActionState(daftarPosisi, {});
  const [lookupState, lookupAction] = useActionState(cariWargaUntukPendaftaran, {});
  const [tahap, setTahap] = useState("cari"); // "cari" -> "isi"
  const [terverifikasi, setTerverifikasi] = useState(null); // { warga_id, nama_lengkap, nik, buktiWarga }
  const [ditolak, setDitolak] = useState(null);
  const [konfirmasiError, setKonfirmasiError] = useState("");
  const [konfirmasiPending, startKonfirmasi] = useTransition();

  if (state?.success) {
    return (
      <div className="text-center">
        <h2 className="text-lg font-bold text-navy">Pendaftaran akun terkirim</h2>
        <p className="mt-2 text-sm text-slate-500">
          Pendaftaran akun Anda sedang menunggu persetujuan admin desa. Anda akan
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
        Semua slot akun Kadus & Ketua RT saat ini sudah terisi. Kalau merasa ada
        yang keliru, hubungi admin desa.
      </p>
    );
  }

  if (tahap === "cari") {
    const tampilForm = !lookupState?.found || ditolak === lookupState;
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          Masukkan NIK dan tanggal lahir Anda — kami akan cari data Anda supaya
          nama tidak perlu diisi ulang.
        </p>

        {tampilForm && (
          <form action={lookupAction} className="space-y-4">
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
              <label className="mb-1 block text-sm text-slate-600">Tanggal Lahir</label>
              <input
                type="date"
                name="tanggal_lahir"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-navy"
              />
            </div>
            {lookupState?.error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{lookupState.error}</p>
            )}
            {konfirmasiError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{konfirmasiError}</p>
            )}
            {lookupState?.notFound && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                {lookupState.message}
              </p>
            )}
            <TombolCari />
          </form>
        )}

        {lookupState?.found && ditolak !== lookupState && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <p className="text-slate-500">Data ditemukan:</p>
              <p className="mt-1 font-semibold text-slate-800">{lookupState.pratinjau.nama}</p>
              <p className="text-slate-500">
                Dusun {lookupState.pratinjau.dusun}
                {lookupState.pratinjau.rt ? `, RT ${lookupState.pratinjau.rt}` : ""}
              </p>
              <p className="mt-2 font-medium text-slate-700">Apakah ini Anda?</p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={konfirmasiPending}
                onClick={() => {
                  setKonfirmasiError("");
                  startKonfirmasi(async () => {
                    const r = await konfirmasiWargaUntukPendaftaran(
                      lookupState.nikDicoba,
                      lookupState.tiket
                    );
                    if (r?.error) {
                      setKonfirmasiError(r.error);
                      setDitolak(lookupState);
                      return;
                    }
                    setTerverifikasi({
                      warga_id: r.data.warga_id,
                      nama_lengkap: r.data.nama_lengkap,
                      nik: lookupState.nikDicoba,
                      buktiWarga: r.buktiWarga || "",
                    });
                    setTahap("isi");
                  });
                }}
                className="flex-1 rounded-lg bg-navy py-2.5 font-medium text-white hover:bg-navy-light disabled:opacity-60"
              >
                {konfirmasiPending ? "Memproses..." : "Ya, ini saya"}
              </button>
              <button
                type="button"
                onClick={() => setDitolak(lookupState)}
                className="flex-1 rounded-lg border border-slate-300 py-2.5 font-medium text-slate-600 hover:bg-slate-50"
              >
                Bukan saya
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setTerverifikasi(null);
            setTahap("isi");
          }}
          className="block w-full text-center text-sm text-navy underline"
        >
          Lewati, isi data manual &rarr;
        </button>

        <Link href="/" className="block text-center text-xs text-slate-400 hover:text-slate-600">
          Kembali ke beranda
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="warga_id" value={terverifikasi?.warga_id || ""} />
      <input type="hidden" name="bukti_warga" value={terverifikasi?.buktiWarga || ""} />
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
          defaultValue={terverifikasi?.nama_lengkap || ""}
          readOnly={!!terverifikasi}
          className={`w-full rounded-lg border px-3 py-2 outline-none focus:border-navy ${
            terverifikasi ? "border-slate-200 bg-slate-50 text-slate-500" : "border-slate-300"
          }`}
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
          defaultValue={terverifikasi?.nik || ""}
          readOnly={!!terverifikasi}
          className={`w-full rounded-lg border px-3 py-2 outline-none focus:border-navy ${
            terverifikasi ? "border-slate-200 bg-slate-50 text-slate-500" : "border-slate-300"
          }`}
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
