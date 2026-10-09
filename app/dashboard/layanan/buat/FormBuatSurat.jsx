"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { buatSuratLangsung, cariWargaStaf } from "./actions";
import { formatTanggalId } from "@/lib/suratTemplate";

const inputKelas =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy";

function TombolBuat() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-navy py-2.5 text-sm font-medium text-white transition hover:bg-navy-light disabled:opacity-60"
    >
      {pending ? "Menyiapkan surat..." : "Lanjut ke Editor Surat"}
    </button>
  );
}

function FieldDinamis({ field, value, onChange }) {
  const umum = {
    required: field.wajib,
    className: inputKelas,
    value: value || "",
    onChange: (e) => onChange(field.field_key, e.target.value),
  };

  if (field.tipe === "teks_panjang") return <textarea rows={3} {...umum} />;
  if (field.tipe === "angka") return <input type="number" {...umum} />;
  if (field.tipe === "tanggal") return <input type="date" {...umum} />;
  if (field.tipe === "pilihan") {
    return (
      <select {...umum}>
        <option value="">Pilih {field.label}</option>
        {(field.opsi || []).map((opsi) => (
          <option key={opsi} value={opsi}>
            {opsi}
          </option>
        ))}
      </select>
    );
  }
  return <input type="text" {...umum} />;
}

function ringkasWilayah(w) {
  return [w.dusun ? `Dusun ${w.dusun}` : null, w.rt || w.rw ? `RT ${w.rt || "-"}/RW ${w.rw || "-"}` : null]
    .filter(Boolean)
    .join(", ");
}

export default function FormBuatSurat({ jenisList, jenisAwalId }) {
  const [jenisId, setJenisId] = useState(jenisAwalId || "");
  const [kata, setKata] = useState("");
  const [hasil, setHasil] = useState([]);
  const [mencari, setMencari] = useState(false);
  const [pesanCari, setPesanCari] = useState(null);
  const [warga, setWarga] = useState(null);
  const [keterangan, setKeterangan] = useState("");
  const [noHp, setNoHp] = useState("");
  const [tambahan, setTambahan] = useState({});

  const [state, aksi] = useActionState(buatSuratLangsung, {});

  const jenis = jenisList.find((j) => j.id === jenisId) || null;
  const formSchema = jenis?.form_schema || [];

  // Cari penduduk setelah petugas berhenti mengetik sejenak.
  useEffect(() => {
    const q = kata.trim();
    if (warga || q.length < 3) {
      setHasil([]);
      setPesanCari(null);
      return;
    }
    let batal = false;
    setMencari(true);
    const timer = setTimeout(async () => {
      const res = await cariWargaStaf(q);
      if (batal) return;
      setMencari(false);
      setHasil(res.hasil || []);
      setPesanCari(
        res.error || ((res.hasil || []).length === 0 ? "Penduduk tidak ditemukan." : null)
      );
    }, 350);
    return () => {
      batal = true;
      clearTimeout(timer);
      setMencari(false);
    };
  }, [kata, warga]);

  function pilihJenis(id) {
    setJenisId(id);
    setTambahan({}); // field tiap jenis surat berbeda
  }

  function pilihWarga(w) {
    setWarga(w);
    setNoHp(w.no_hp || "");
    setKata("");
    setHasil([]);
  }

  function gantiWarga() {
    setWarga(null);
    setNoHp("");
  }

  return (
    <form action={aksi} className="space-y-6">
      <input type="hidden" name="jenis_layanan_id" value={jenisId} />
      <input type="hidden" name="warga_id" value={warga?.id || ""} />
      <input type="hidden" name="data_tambahan_json" value={JSON.stringify(tambahan)} />

      {/* 1. Jenis surat */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-800">1. Pilih jenis surat</h2>
        <select
          value={jenisId}
          onChange={(e) => pilihJenis(e.target.value)}
          required
          className={`${inputKelas} mt-3`}
        >
          <option value="">Pilih jenis surat...</option>
          {jenisList.map((j) => (
            <option key={j.id} value={j.id}>
              {j.nama_layanan}
              {j.aktif ? "" : " (tidak dibuka untuk warga)"}
            </option>
          ))}
        </select>
      </section>

      {/* 2. Penduduk */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-800">2. Pilih penduduk</h2>
        <p className="mt-1 text-xs text-slate-400">
          Nama, NIK, tempat/tanggal lahir, alamat, dan data lain akan terisi otomatis dari data
          kependudukan.
        </p>

        {warga ? (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
            <p className="font-semibold text-slate-800">{warga.nama_lengkap}</p>
            <p className="text-slate-600">NIK {warga.nik}</p>
            <p className="text-slate-500">
              {[formatTanggalId(warga.tanggal_lahir), ringkasWilayah(warga)]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <button
              type="button"
              onClick={gantiWarga}
              className="mt-2 text-xs font-medium text-navy underline"
            >
              Ganti penduduk
            </button>
          </div>
        ) : (
          <div className="mt-3">
            <input
              type="text"
              value={kata}
              onChange={(e) => setKata(e.target.value)}
              placeholder="Ketik nama atau NIK (minimal 3 karakter)..."
              className={inputKelas}
              autoComplete="off"
            />
            {mencari && <p className="mt-2 text-xs text-slate-400">Mencari...</p>}
            {!mencari && pesanCari && (
              <p className="mt-2 text-xs text-amber-700">{pesanCari}</p>
            )}
            {hasil.length > 0 && (
              <ul className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                {hasil.map((w) => (
                  <li key={w.id}>
                    <button
                      type="button"
                      onClick={() => pilihWarga(w)}
                      className="block w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50"
                    >
                      <span className="font-medium text-slate-800">{w.nama_lengkap}</span>
                      <span className="ml-2 font-mono text-xs text-slate-400">{w.nik}</span>
                      <span className="block text-xs text-slate-400">
                        {[formatTanggalId(w.tanggal_lahir), ringkasWilayah(w)]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-slate-400">
              Penduduk belum terdata? Tambahkan dulu di{" "}
              <Link href="/dashboard/kependudukan/tambah" className="text-navy underline">
                Data Kependudukan
              </Link>
              .
            </p>
          </div>
        )}
      </section>

      {/* 3. Keperluan & data tambahan */}
      {jenis && warga && (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-slate-800">3. Keperluan & data tambahan</h2>

          <div>
            <label className="mb-1 block text-sm text-slate-600">Keperluan / keterangan</label>
            <textarea
              rows={2}
              name="keterangan"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Mis. persyaratan melamar pekerjaan (opsional)"
              className={inputKelas}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-600">No. HP / WhatsApp</label>
            <input
              type="tel"
              name="no_hp"
              value={noHp}
              onChange={(e) => setNoHp(e.target.value)}
              className={inputKelas}
            />
            <p className="mt-1 text-xs text-slate-400">
              {warga.no_hp
                ? "Diisi otomatis dari data kependudukan, masih bisa diganti."
                : "Belum ada di data kependudukan. Boleh dikosongkan."}
            </p>
          </div>

          {formSchema.map((field) => (
            <div key={field.field_key}>
              <label className="mb-1 block text-sm text-slate-600">
                {field.label}
                {field.wajib && <span className="text-red-500"> *</span>}
              </label>
              <FieldDinamis
                field={field}
                value={tambahan[field.field_key]}
                onChange={(k, v) => setTambahan((prev) => ({ ...prev, [k]: v }))}
              />
            </div>
          ))}
        </section>
      )}

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}

      {jenis && warga && <TombolBuat />}
    </form>
  );
}
