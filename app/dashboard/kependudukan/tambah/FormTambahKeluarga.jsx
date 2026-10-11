"use client";

import { useEffect, useState, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { tambahKeluargaWarga } from "../actions";
import { PEKERJAAN_OPTIONS } from "@/lib/pekerjaanOptions";
import { PENDIDIKAN_OPTIONS } from "@/lib/pendidikanOptions";

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
    pendidikan: "",
  };
}

function TombolSimpan({ disabled, label = "Simpan Data Keluarga" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="rounded-lg bg-navy px-5 py-2.5 text-sm font-medium text-white hover:bg-navy-light disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : label}
    </button>
  );
}

// Dua mode:
//  - Biasa (keluargaAda = null): keluarga baru, No. KK + alamat diisi di form.
//  - Tambah anggota (keluargaAda terisi): No. KK dikirim sebagai isian
//    tersembunyi dan alamat/dusun/RT/RW SENGAJA tidak dikirim, sehingga
//    anggota baru otomatis ikut alamat keluarga yang sudah tercatat
//    (trigger database `sinkronkan_keluarga`, migrasi 0012) dan tidak mengubah
//    data alamat anggota lain.
export default function FormTambahKeluarga({
  pilihanDusun = [],
  dusunTerkunci = false,
  keluargaAda = null,
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(tambahKeluargaWarga, {});
  const [anggota, setAnggota] = useState([anggotaKosong()]);
  const modeTambahAnggota = Boolean(keluargaAda);
  const wilayahKeluarga = keluargaAda
    ? [keluargaAda.dusun, keluargaAda.rt && `RT ${keluargaAda.rt}`, keluargaAda.rw && `RW ${keluargaAda.rw}`]
        .filter(Boolean)
        .join(" · ")
    : "";
  const halamanKeluarga = modeTambahAnggota
    ? `/dashboard/kependudukan/keluarga/${keluargaAda.no_kk}`
    : "/dashboard/kependudukan";

  useEffect(() => {
    if (state?.success) {
      router.push(halamanKeluarga);
    }
  }, [state, router, halamanKeluarga]);

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
        {modeTambahAnggota && (
          <Link href={halamanKeluarga} className="text-sm text-slate-400 hover:text-slate-600">
            &larr; Kembali ke detail keluarga
          </Link>
        )}
        <h1 className={`text-lg font-bold text-slate-800 ${modeTambahAnggota ? "mt-2" : ""}`}>
          {modeTambahAnggota ? "Tambah Anggota Keluarga" : "Tambah Data Keluarga"}
        </h1>
        <p className="text-sm text-slate-500">
          {modeTambahAnggota
            ? "No. KK dan alamat sudah terisi otomatis dari keluarga ini. Cukup isi data orang yang ingin ditambahkan."
            : "No. KK dan alamat cukup diisi sekali untuk seluruh anggota keluarga. Kalau kartu keluarga ini cuma berisi 1 orang, biarkan hanya 1 baris anggota di bawah — tidak wajib ditambah."}
        </p>
      </div>

      <form action={formAction} className="space-y-6">
        {/* Mode tambah anggota: ringkasan keluarga (hanya baca) + No. KK tersembunyi */}
        {modeTambahAnggota && (
          <div className="space-y-3 rounded-2xl border border-navy/15 bg-navy/5 p-6">
            <input type="hidden" name="no_kk" value={keluargaAda.no_kk} />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-700">Keluarga yang ditambah</h2>
              <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                Terkunci
              </span>
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-slate-400">No. KK</dt>
                <dd className="font-mono font-medium text-slate-800">{keluargaAda.no_kk}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Kepala Keluarga</dt>
                <dd className="font-medium text-slate-800">
                  {keluargaAda.namaKepala ?? <span className="text-slate-400">Belum ditentukan</span>}
                  <span className="ml-1.5 text-xs font-normal text-slate-400">
                    ({keluargaAda.jumlahAnggota} anggota aktif)
                  </span>
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-slate-400">Alamat</dt>
                <dd className="text-slate-800">
                  {keluargaAda.alamat || <span className="text-slate-400">Belum diisi</span>}
                  {wilayahKeluarga && (
                    <span className="block text-xs text-slate-500">{wilayahKeluarga}</span>
                  )}
                </dd>
              </div>
            </dl>
            <p className="text-xs text-slate-500">
              Anggota baru otomatis ikut alamat ini. Untuk mengubah alamat keluarga, gunakan menu Edit pada salah satu anggota.
            </p>
          </div>
        )}

        {/* Data kartu keluarga (No. KK + alamat, sekali untuk semua anggota) — hanya untuk keluarga baru */}
        {!modeTambahAnggota && (
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
              <select
                name="dusun"
                defaultValue={pilihanDusun.length === 1 ? pilihanDusun[0] : ""}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
              >
                {!dusunTerkunci && <option value="">Pilih dusun</option>}
                {pilihanDusun.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              {pilihanDusun.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  Daftar dusun belum dibuat. Minta Administrator menambahkannya di menu Posisi.
                </p>
              )}
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
        )}

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
                  <option value="Kepala Keluarga" disabled={modeTambahAnggota && keluargaAda.adaKepala}>
                    Kepala Keluarga
                    {modeTambahAnggota && keluargaAda.adaKepala ? " (sudah ada)" : ""}
                  </option>
                  <option value="Istri">Istri</option>
                  <option value="Anak">Anak</option>
                  <option value="Famili Lain">Famili Lain</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
                <p className="mt-1 text-xs text-slate-400">
                  {modeTambahAnggota && keluargaAda.adaKepala
                    ? `Keluarga ini sudah punya Kepala Keluarga (${keluargaAda.namaKepala}), jadi pilih hubungan lain seperti Istri atau Anak.`
                    : 'Maksimal 1 orang "Kepala Keluarga" per No. KK — sistem akan menolak otomatis kalau ada 2.'}
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

              <div>
                <label className="mb-1 block text-sm text-slate-600">Pendidikan Terakhir</label>
                <select
                  value={a.pendidikan}
                  onChange={(e) => ubahAnggota(idx, "pendidikan", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
                >
                  <option value="" disabled>Pilih</option>
                  {PENDIDIKAN_OPTIONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
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
          <TombolSimpan disabled={anggota.length === 0} label={modeTambahAnggota ? "Simpan Anggota Baru" : undefined} />
          <Link href={halamanKeluarga} className="text-sm text-slate-500 hover:text-slate-700">
            Batal
          </Link>
        </div>
      </form>
    </div>
  );
}
