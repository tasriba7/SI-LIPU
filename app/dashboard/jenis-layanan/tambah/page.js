"use client";

import { useState, useEffect, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { buatJenisLayanan } from "../actions";
import { TIPE_FIELD, KATEGORI_LAYANAN, ICON_LAYANAN } from "@/lib/formBuilder";
import { IconPlus, IconTrash } from "@/components/icons";

function TombolSimpan() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-navy px-5 py-2.5 text-sm font-medium text-white hover:bg-navy-light disabled:opacity-60"
    >
      {pending ? "Menyimpan..." : "Simpan & Aktifkan"}
    </button>
  );
}

let idCounter = 0;
function fieldKosong() {
  idCounter += 1;
  return { _uid: idCounter, field_key: "", label: "", tipe: "teks_pendek", wajib: false, opsi: [] };
}

export default function TambahJenisLayananPage() {
  const router = useRouter();
  const [fields, setFields] = useState([]);
  const [state, formAction] = useActionState(buatJenisLayanan, {});

  useEffect(() => {
    if (state?.success) {
      router.push("/dashboard/jenis-layanan");
    }
  }, [state, router]);

  function tambahField() {
    setFields((prev) => [...prev, fieldKosong()]);
  }

  function hapusField(uid) {
    setFields((prev) => prev.filter((f) => f._uid !== uid));
  }

  function ubahField(uid, key, value) {
    setFields((prev) =>
      prev.map((f) => (f._uid === uid ? { ...f, [key]: value } : f))
    );
  }

  // field_key otomatis dari label (slug), supaya admin tidak perlu mikirin
  // format teknis — cukup isi label yang mereka lihat.
  function slugkan(label) {
    return label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function siapkanFormSchema() {
    return fields
      .filter((f) => f.label.trim())
      .map((f) => ({
        field_key: f.field_key || slugkan(f.label),
        label: f.label,
        tipe: f.tipe,
        wajib: f.wajib,
        ...(f.tipe === "pilihan" ? { opsi: f.opsi } : {}),
      }));
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-bold text-slate-800">Tambah Jenis Layanan</h1>
        <p className="text-sm text-slate-500">
          Isi info dasar, lalu susun field yang perlu diisi warga. Field NIK,
          nama, dan no. HP sudah otomatis ada — tidak perlu ditambahkan lagi.
        </p>
      </div>

      <form action={formAction} className="space-y-6">
        <input
          type="hidden"
          name="form_schema_json"
          value={JSON.stringify(siapkanFormSchema())}
        />

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-600">Info Dasar</h2>

          <div>
            <label className="mb-1 block text-sm text-slate-600">Nama layanan</label>
            <input
              type="text"
              name="nama_layanan"
              required
              placeholder="Mis. Surat Keterangan Beasiswa"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-navy"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-slate-600">Kategori</label>
              <select
                name="kategori"
                required
                defaultValue=""
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-navy"
              >
                <option value="" disabled>
                  Pilih kategori
                </option>
                {KATEGORI_LAYANAN.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-600">Ikon</label>
              <select
                name="icon"
                required
                defaultValue="mail"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-navy"
              >
                {ICON_LAYANAN.map((i) => (
                  <option key={i.value} value={i.value}>
                    {i.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-600">
              Prefix kode tracking (2-5 huruf)
            </label>
            <input
              type="text"
              name="kode_prefix"
              required
              maxLength={5}
              placeholder="Mis. BSW"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 uppercase outline-none focus:border-navy"
            />
            <p className="mt-1 text-xs text-slate-400">
              Contoh kode yang akan dibuat: BSW-AB12CD
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-600">
              Deskripsi singkat (opsional)
            </label>
            <textarea
              name="deskripsi"
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-navy"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" name="butuh_lookup_warga" defaultChecked className="h-4 w-4" />
            Aktifkan pencarian data warga (NIK + Tanggal Lahir) untuk auto-isi nama & alamat
          </label>
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-600">
              Field Tambahan (di luar NIK, Nama, No. HP)
            </h2>
            <button
              type="button"
              onClick={tambahField}
              className="flex items-center gap-1 text-sm font-medium text-navy hover:underline"
            >
              <IconPlus className="h-4 w-4" />
              Tambah Field
            </button>
          </div>

          {fields.length === 0 && (
            <p className="text-sm text-slate-400">
              Belum ada field tambahan. Klik &quot;Tambah Field&quot; kalau layanan
              ini butuh info khusus (mis. nama sekolah, jenis usaha, dll).
            </p>
          )}

          <div className="space-y-4">
            {fields.map((f) => (
              <div key={f._uid} className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">
                      Label field (dilihat warga)
                    </label>
                    <input
                      type="text"
                      value={f.label}
                      onChange={(e) => ubahField(f._uid, "label", e.target.value)}
                      placeholder="Mis. Nama Sekolah"
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-navy"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Tipe input</label>
                    <select
                      value={f.tipe}
                      onChange={(e) => ubahField(f._uid, "tipe", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-navy"
                    >
                      {TIPE_FIELD.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {f.tipe === "pilihan" && (
                  <div className="mb-3">
                    <label className="mb-1 block text-xs text-slate-500">
                      Daftar opsi (pisahkan dengan koma)
                    </label>
                    <input
                      type="text"
                      placeholder="Mis. Kios/Toko, Warung Makan, Bengkel"
                      onChange={(e) =>
                        ubahField(
                          f._uid,
                          "opsi",
                          e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-navy"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-slate-500">
                    <input
                      type="checkbox"
                      checked={f.wajib}
                      onChange={(e) => ubahField(f._uid, "wajib", e.target.checked)}
                      className="h-3.5 w-3.5"
                    />
                    Wajib diisi
                  </label>
                  <button
                    type="button"
                    onClick={() => hapusField(f._uid)}
                    className="flex items-center gap-1 text-xs text-red-500 hover:underline"
                  >
                    <IconTrash className="h-3.5 w-3.5" />
                    Hapus field
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {state?.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
        )}

        <div className="flex items-center gap-3">
          <TombolSimpan />
          <Link
            href="/dashboard/jenis-layanan"
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Batal
          </Link>
        </div>
      </form>
    </div>
  );
}
