"use client";

import { useEffect, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { tambahWarga } from "../actions";

function TombolSimpan() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-navy px-5 py-2.5 text-sm font-medium text-white hover:bg-navy-light disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Simpan Data Warga"}
    </button>
  );
}

export default function TambahWargaPage() {
  const router = useRouter();
  const [state, formAction] = useActionState(tambahWarga, {});

  useEffect(() => {
    if (state?.success) {
      router.push("/dashboard/kependudukan");
    }
  }, [state, router]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-bold text-slate-800">Tambah Data Warga</h1>
        <p className="text-sm text-slate-500">
          Data ini dipakai untuk auto-isi form warga (lewat NIK + Tanggal
          Lahir) di menu Ajukan Layanan.
        </p>
      </div>

      <form action={formAction} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm text-slate-600">NIK (16 digit)</label>
            <input
              type="text"
              name="nik"
              required
              maxLength={16}
              inputMode="numeric"
              pattern="\d{16}"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">No. KK</label>
            <input
              type="text"
              name="no_kk"
              maxLength={16}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-600">Nama lengkap</label>
          <input
            type="text"
            name="nama_lengkap"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm text-slate-600">Tempat lahir</label>
            <input
              type="text"
              name="tempat_lahir"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">Tanggal lahir</label>
            <input
              type="date"
              name="tanggal_lahir"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm text-slate-600">Jenis kelamin</label>
            <select
              name="jenis_kelamin"
              defaultValue=""
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
            >
              <option value="" disabled>
                Pilih
              </option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">Status kawin</label>
            <select
              name="status_kawin"
              defaultValue=""
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
            >
              <option value="" disabled>
                Pilih
              </option>
              <option value="Belum Kawin">Belum Kawin</option>
              <option value="Kawin">Kawin</option>
              <option value="Cerai Hidup">Cerai Hidup</option>
              <option value="Cerai Mati">Cerai Mati</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-600">Alamat</label>
          <textarea
            name="alamat"
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-sm text-slate-600">Dusun</label>
            <input
              type="text"
              name="dusun"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">RT</label>
            <input
              type="text"
              name="rt"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">RW</label>
            <input
              type="text"
              name="rw"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-600">
            No. HP / WhatsApp <span className="text-slate-400">(opsional)</span>
          </label>
          <input
            type="tel"
            name="no_hp"
            placeholder="Mis. 08xxxxxxxxxx"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
          />
          <p className="mt-1 text-xs text-slate-400">
            Nomor telepon biasa atau nomor Whatsapp.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm text-slate-600">Pekerjaan</label>
            <input
              type="text"
              name="pekerjaan"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">Agama</label>
            <select
              name="agama"
              defaultValue=""
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
            >
              <option value="" disabled>
                Pilih
              </option>
              <option>Islam</option>
              <option>Kristen Protestan</option>
              <option>Katolik</option>
              <option>Hindu</option>
              <option>Buddha</option>
              <option>Konghucu</option>
              <option>Lainnya</option>
            </select>
          </div>
        </div>

        {state?.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
        )}

        <div className="flex items-center gap-3">
          <TombolSimpan />
          <Link href="/dashboard/kependudukan" className="text-sm text-slate-500 hover:text-slate-700">
            Batal
          </Link>
        </div>
      </form>
    </div>
  );
}
