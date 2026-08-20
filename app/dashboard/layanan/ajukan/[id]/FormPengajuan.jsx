"use client";

import { useState, useEffect, useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { cariWargaUntukLayanan, ajukanLayanan } from "./actions";
import { maskNama, maskWilayah } from "@/lib/masking";

function TombolAksi({ children, pendingText }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-navy py-2.5 font-medium text-white transition hover:bg-navy-light disabled:opacity-60"
    >
      {pending ? pendingText : children}
    </button>
  );
}

function FieldDinamis({ field, value, onChange }) {
  const base =
    "w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-navy";

  if (field.tipe === "teks_panjang") {
    return (
      <textarea
        required={field.wajib}
        rows={3}
        className={base}
        value={value || ""}
        onChange={(e) => onChange(field.field_key, e.target.value)}
      />
    );
  }
  if (field.tipe === "angka") {
    return (
      <input
        type="number"
        required={field.wajib}
        className={base}
        value={value || ""}
        onChange={(e) => onChange(field.field_key, e.target.value)}
      />
    );
  }
  if (field.tipe === "tanggal") {
    return (
      <input
        type="date"
        required={field.wajib}
        className={base}
        value={value || ""}
        onChange={(e) => onChange(field.field_key, e.target.value)}
      />
    );
  }
  if (field.tipe === "pilihan") {
    return (
      <select
        required={field.wajib}
        defaultValue=""
        className={base}
        value={value || ""}
        onChange={(e) => onChange(field.field_key, e.target.value)}
      >
        <option value="" disabled>
          Pilih {field.label}
        </option>
        {(field.opsi || []).map((opsi) => (
          <option key={opsi} value={opsi}>
            {opsi}
          </option>
        ))}
      </select>
    );
  }
  // default: teks_pendek
  return (
    <input
      type="text"
      required={field.wajib}
      className={base}
      value={value || ""}
      onChange={(e) => onChange(field.field_key, e.target.value)}
    />
  );
}

export default function FormPengajuan({ jenisLayanan }) {
  const butuhLookup = jenisLayanan.butuh_lookup_warga;
  const formSchema = jenisLayanan.form_schema || [];

  // "lookup" -> "konfirmasi" -> "isi" -> selesai (state success dari ajukanLayanan)
  const [tahap, setTahap] = useState(butuhLookup ? "lookup" : "isi");
  const [wargaTerpilih, setWargaTerpilih] = useState(null); // { warga_id, nama_lengkap, dusun, rt, rw }
  const [nikDicoba, setNikDicoba] = useState("");
  const [dataTambahan, setDataTambahan] = useState({});

  const [lookupState, lookupAction] = useActionState(cariWargaUntukLayanan, {});
  const [submitState, submitAction] = useActionState(ajukanLayanan, {});

  // Simpan NIK yang dicoba begitu lookup berhasil — WAJIB di useEffect,
  // bukan dipanggil langsung saat render (itu penyebab bug "client-side
  // exception": setState saat render memicu render berulang tanpa henti).
  useEffect(() => {
    if (lookupState?.found && tahap === "lookup") {
      setNikDicoba(lookupState.nikDicoba);
    }
  }, [lookupState, tahap]);

  function ubahFieldTambahan(key, value) {
    setDataTambahan((prev) => ({ ...prev, [key]: value }));
  }

  // --- Tahap 1: cari data warga ---
  if (tahap === "lookup") {
    return (
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-navy">{jenisLayanan.nama_layanan}</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500">
          Masukkan NIK dan tanggal lahir Anda — kami akan cari data Anda supaya
          tidak perlu isi ulang nama & alamat.
        </p>

        {!lookupState?.found && (
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
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {lookupState.error}
              </p>
            )}
            {lookupState?.notFound && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                {lookupState.message}
              </p>
            )}

            <TombolAksi pendingText="Mencari...">Cari Data Saya</TombolAksi>
          </form>
        )}

        {lookupState?.found && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <p className="text-slate-500">Data ditemukan:</p>
              <p className="mt-1 font-semibold text-slate-800">
                {maskNama(lookupState.data.nama_lengkap)}
              </p>
              <p className="text-slate-500">
                Dusun {maskWilayah(lookupState.data.dusun)}
                {lookupState.data.rt ? `, RT ${maskWilayah(lookupState.data.rt)}` : ""}
              </p>
              <p className="mt-2 font-medium text-slate-700">Apakah ini Anda?</p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setWargaTerpilih(lookupState.data);
                  setTahap("isi");
                }}
                className="flex-1 rounded-lg bg-navy py-2.5 font-medium text-white hover:bg-navy-light"
              >
                Ya, ini saya
              </button>
              <button
                type="button"
                onClick={() => {
                  setWargaTerpilih(null);
                  setTahap("isi");
                }}
                className="flex-1 rounded-lg border border-slate-300 py-2.5 font-medium text-slate-600 hover:bg-slate-50"
              >
                Bukan saya
              </button>
            </div>
          </div>
        )}

        {(lookupState?.notFound || lookupState?.error) && (
          <button
            type="button"
            onClick={() => setTahap("isi")}
            className="mt-3 block w-full text-center text-sm text-navy underline"
          >
            Lanjut isi data manual &rarr;
          </button>
        )}

        <Link
          href="/layanan"
          className="mt-6 block text-center text-xs text-slate-400 hover:text-slate-600"
        >
          Kembali ke daftar layanan
        </Link>
      </div>
    );
  }

  // --- Tahap 2: isi form (field standar + field dinamis) ---
  if (tahap === "isi" && !submitState?.success) {
    return (
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-navy">{jenisLayanan.nama_layanan}</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500">
          Lengkapi data di bawah, lalu kirim. Anda akan dapat kode tracking untuk
          cek status.
        </p>

        <form action={submitAction} className="space-y-4">
          <input type="hidden" name="jenis_layanan_id" value={jenisLayanan.id} />
          <input type="hidden" name="kode_prefix" value={jenisLayanan.kode_prefix} />
          <input type="hidden" name="warga_id" value={wargaTerpilih?.warga_id || ""} />
          <input
            type="hidden"
            name="data_tambahan_json"
            value={JSON.stringify(dataTambahan)}
          />

          <div>
            <label className="mb-1 block text-sm text-slate-600">Nama lengkap</label>
            <input
              type="text"
              name="nama_pemohon"
              required
              defaultValue={wargaTerpilih?.nama_lengkap || ""}
              readOnly={!!wargaTerpilih}
              className={`w-full rounded-lg border px-3 py-2 outline-none focus:border-navy ${
                wargaTerpilih ? "border-slate-200 bg-slate-50 text-slate-500" : "border-slate-300"
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
              defaultValue={nikDicoba}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-navy"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-600">No. HP / WhatsApp</label>
            <input
              type="tel"
              name="no_hp"
              required
              defaultValue={wargaTerpilih?.no_hp || ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-navy"
            />
            {wargaTerpilih?.no_hp && (
              <p className="mt-1 text-xs text-slate-400">
                Diisi otomatis dari data Anda — masih bisa diganti kalau perlu.
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-600">Keterangan</label>
            <textarea
              name="keterangan"
              rows={2}
              placeholder="Keperluan / detail tambahan (opsional)"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-navy"
            />
          </div>

          {formSchema.map((field) => (
            <div key={field.field_key}>
              <label className="mb-1 block text-sm text-slate-600">
                {field.label}
                {field.wajib && <span className="text-red-500"> *</span>}
              </label>
              <FieldDinamis
                field={field}
                value={dataTambahan[field.field_key]}
                onChange={ubahFieldTambahan}
              />
            </div>
          ))}

          {submitState?.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {submitState.error}
            </p>
          )}

          <TombolAksi pendingText="Mengirim...">Kirim Pengajuan</TombolAksi>
        </form>

        <Link
          href="/layanan"
          className="mt-4 block text-center text-xs text-slate-400 hover:text-slate-600"
        >
          Kembali ke daftar layanan
        </Link>
      </div>
    );
  }

  // --- Selesai ---
  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
      <h1 className="text-lg font-bold text-navy">Pengajuan terkirim</h1>
      <p className="mt-2 text-sm text-slate-500">
        Simpan kode tracking di bawah ini baik-baik — dipakai untuk cek status
        pengajuan Anda kapan saja.
      </p>
      <p className="mt-4 rounded-lg bg-slate-100 py-3 font-mono text-xl font-bold tracking-widest text-navy">
        {submitState.kode_tracking}
      </p>
      <Link
        href="/layanan/cek"
        className="mt-6 inline-block text-sm font-medium text-navy underline"
      >
        Cek status sekarang &rarr;
      </Link>
      <br />
      <Link href="/" className="mt-3 inline-block text-xs text-slate-400 hover:text-slate-600">
        Kembali ke beranda
      </Link>
    </div>
  );
}
