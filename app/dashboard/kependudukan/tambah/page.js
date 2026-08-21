"use client";

import { useEffect, useState, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { tambahKeluargaWarga } from "../actions";
import { PEKERJAAN_OPTIONS } from "@/lib/pekerjaanOptions";

function anggotaKosong() {
  return {
    key: crypto.randomUUID(),
    nik: "",
    nama_lengkap: "",
    tempat_lahir: "",
    tanggal_lahir: "",
    jenis_kelamin: "",
    status_kawin: "",
    status_dalam_kk: "",
    no_hp: "",
    pekerjaan: "",
    agama: "",
  };
}

function TombolSimpan({ disabled }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="rounded-lg bg-navy px-5 py-2.5 text-sm font-medium text-white hover:bg-navy-light disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Simpan Data Keluarga"}
    </button>
  );
}

export default function TambahWargaPage() {
  const router = useRouter();
  const [state, formAction] = useActionState(tambahKeluargaWarga, {});
  const [anggota, setAnggota] = useState([anggotaKosong()]);

  useEffect(() => {
    if (state?.success) {
      router.push("/dashboard/kependudukan");
    }
  }, [state, router]);

  function ubahAnggota(idx, field, value) {
    setAnggota((prev) =>
      prev.map((a, i) => (i === idx ? { ...a, [field]: value } : a))
    );
  }

  function tambahBarisAnggota() {
    setAnggota((prev) => [...prev, anggotaKosong()]);
  }

  function hapusBarisAnggota(idx) {
    setAnggota((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-lg font-bold text-slate-800">Tambah Data Keluarga</h1>
        <p className="text-sm text-slate-500">
          No. KK dan alamat cukup diisi sekali untuk seluruh anggota keluarga.
          Kalau kartu keluarga ini cuma berisi 1 orang, biarkan hanya 1 baris
          anggota di bawah — tidak wajib ditambah.
        </p>
      </div>

      <form action={formAction} className="space-y-6">
        {/* Data kartu keluarga (No. KK + alamat, sekali untuk semua anggota) */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-slate-700">Data Kartu Keluarga</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-slate-600">No. KK</label>
              <input
                type="text"
                name="no_kk"
                maxLength={16}
                placeholder="16 digit, kosongkan jika belum ada"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
              />
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
        </div>

        {/* Anggota keluarga, bisa ditambah berulang */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">Anggota Keluarga</h2>

          {anggota.map((a, idx) => (
            <div
              key={a.key}
              className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">
                  Anggota {idx + 1}
                </p>
                {anggota.length > 1 && (
                  <button
                    type="button"
                    onClick={() => hapusBarisAnggota(idx)}
                    className="text-xs font-medium text-red-500 hover:underline"
                  >
                    Hapus anggota ini
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm text-slate-600">NIK (16 digit)</label>
                  <input
                    type="text"
                    required
                    maxLength={16}
                    inputMode="numeric"
                    pattern="\d{16}"
                    value={a.nik}
                    onChange={(e) => ubahAnggota(idx, "nik", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-600">Nama lengkap</label>
                  <input
                    type="text"
                    required
                    value={a.nama_lengkap}
                    onChange={(e) => ubahAnggota(idx, "nama_lengkap", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm text-slate-600">Tempat lahir</label>
                  <input
                    type="text"
                    value={a.tempat_lahir}
                    onChange={(e) => ubahAnggota(idx, "tempat_lahir", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-600">Tanggal lahir</label>
                  <input
                    type="date"
                    required
                    value={a.tanggal_lahir}
                    onChange={(e) => ubahAnggota(idx, "tanggal_lahir", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm text-slate-600">Jenis kelamin</label>
                  <select
                    value={a.jenis_kelamin}
                    onChange={(e) => ubahAnggota(idx, "jenis_kelamin", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
                  >
                    <option value="" disabled>Pilih</option>
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-600">Status kawin</label>
                  <select
                    value={a.status_kawin}
                    onChange={(e) => ubahAnggota(idx, "status_kawin", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
                  >
                    <option value="" disabled>Pilih</option>
                    <option value="Belum Kawin">Belum Kawin</option>
                    <option value="Kawin">Kawin</option>
                    <option value="Cerai Hidup">Cerai Hidup</option>
                    <option value="Cerai Mati">Cerai Mati</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-600">Status dalam Kartu Keluarga</label>
                <select
                  value={a.status_dalam_kk}
                  onChange={(e) => ubahAnggota(idx, "status_dalam_kk", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
                >
                  <option value="" disabled>Pilih</option>
                  <option value="Kepala Keluarga">Kepala Keluarga</option>
                  <option value="Istri">Istri</option>
                  <option value="Anak">Anak</option>
                  <option value="Famili Lain">Famili Lain</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
                <p className="mt-1 text-xs text-slate-400">
                  Maksimal 1 orang "Kepala Keluarga" per No. KK — sistem akan menolak otomatis kalau ada 2.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-600">
                  No. HP / WhatsApp <span className="text-slate-400">(opsional)</span>
                </label>
                <input
                  type="tel"
                  placeholder="Mis. 08xxxxxxxxxx"
                  value={a.no_hp}
                  onChange={(e) => ubahAnggota(idx, "no_hp", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm text-slate-600">Pekerjaan</label>
                  <select
                    value={a.pekerjaan}
                    onChange={(e) => ubahAnggota(idx, "pekerjaan", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
                  >
                    <option value="" disabled>Pilih</option>
                    {PEKERJAAN_OPTIONS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-600">Agama</label>
                  <select
                    value={a.agama}
                    onChange={(e) => ubahAnggota(idx, "agama", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
                  >
                    <option value="" disabled>Pilih</option>
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
            </div>
          ))}

          <button
            type="button"
            onClick={tambahBarisAnggota}
            className="w-full rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-navy hover:bg-slate-50"
          >
            + Tambah Anggota Lain (opsional)
          </button>
        </div>

        <input type="hidden" name="anggota" value={JSON.stringify(anggota)} />

        {state?.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
        )}

        <div className="flex items-center gap-3">
          <TombolSimpan disabled={anggota.length === 0} />
          <Link href="/dashboard/kependudukan" className="text-sm text-slate-500 hover:text-slate-700">
            Batal
          </Link>
        </div>
      </form>
    </div>
  );
}
