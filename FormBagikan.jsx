"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { buatTautanData } from "./actions";
import CopyButton from "@/components/CopyButton";
import WaktuLokal from "@/components/WaktuLokal";
import { SEKSI_TAUTAN, PILIHAN_HARI, HARI_DEFAULT } from "@/lib/tautanDataSeksi";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy";

function TombolBuat() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-navy px-5 py-2.5 text-sm font-medium text-white transition hover:bg-navy-light disabled:opacity-60"
    >
      {pending ? "Membuat tautan..." : "Buat Tautan Sekali Pakai"}
    </button>
  );
}

export default function FormBagikan() {
  const [state, formAction] = useActionState(buatTautanData, {});
  const [terpilih, setTerpilih] = useState([]);
  const formRef = useRef(null);

  const adaSensitif = SEKSI_TAUTAN.some((s) => s.sensitif && terpilih.includes(s.id));

  function toggle(id) {
    setTerpilih((lama) =>
      lama.includes(id) ? lama.filter((x) => x !== id) : [...lama, id]
    );
  }

  // Setelah tautan berhasil dibuat, tampilkan hasilnya (sekali saja).
  if (state?.ok) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-800">
            Tautan untuk {state.instansi} sudah dibuat
          </p>
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-200 bg-white p-3">
            <p className="min-w-0 flex-1 break-all font-mono text-xs text-slate-700">
              {state.tautan}
            </p>
            <CopyButton text={state.tautan} label="Salin tautan" />
          </div>
          <ul className="mt-3 space-y-1 text-xs text-emerald-800">
            <li>
              • Tautan ini <b>hanya tampil di layar ini</b>. Setelah Anda pindah
              halaman, tautan tidak bisa ditampilkan lagi (kalau hilang, buat
              yang baru).
            </li>
            <li>
              • Penerima akan melihat peringatan <b>sekali pakai</b> lebih dulu.
              Tautan hangus setelah penerima menekan tombol buka data.
            </li>
            <li>
              • Kalau belum juga dibuka, tautan hangus otomatis pada{" "}
              <WaktuLokal iso={state.kedaluwarsa} />.
            </li>
          </ul>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Buat tautan lain
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      {state?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">
          Untuk instansi/lembaga apa? <span className="text-red-500">*</span>
        </label>
        <input
          name="instansi"
          required
          maxLength={120}
          placeholder="Contoh: Dinas Sosial Kabupaten"
          className={inputClass}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">
          Keperluan (boleh dikosongkan)
        </label>
        <input
          name="keperluan"
          maxLength={300}
          placeholder="Contoh: Pendataan penerima bantuan"
          className={inputClass}
        />
        <p className="mt-1 text-[11px] text-slate-400">
          Ikut ditampilkan di halaman peringatan penerima dan tercatat di riwayat.
        </p>
      </div>

      <fieldset>
        <legend className="mb-2 block text-xs font-medium text-slate-500">
          Data apa yang dibagikan? Centang yang perlu saja.
        </legend>
        <div className="space-y-2">
          {SEKSI_TAUTAN.map((s) => (
            <label
              key={s.id}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                terpilih.includes(s.id)
                  ? "border-navy bg-navy/5"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input
                type="checkbox"
                name="seksi"
                value={s.id}
                checked={terpilih.includes(s.id)}
                onChange={() => toggle(s.id)}
                className="mt-0.5 h-4 w-4 accent-[#0B2C6B]"
              />
              <span>
                <span className="block text-sm font-semibold text-slate-700">
                  {s.label}
                  {s.sensitif && (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                      Berisi data pribadi
                    </span>
                  )}
                </span>
                <span className="block text-xs text-slate-400">{s.ket}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {adaSensitif && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Pilihan Anda berisi data pribadi warga (NIK, alamat, dll.). Pastikan
          instansi penerima memang berhak dan berkepentingan, dan sebaiknya ada
          surat permintaan resmi.
        </p>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">
          Batas waktu kalau tautan belum dibuka
        </label>
        <select name="hari" defaultValue={HARI_DEFAULT} className={inputClass}>
          {PILIHAN_HARI.map((h) => (
            <option key={h} value={h}>
              {h} hari
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-slate-400">
          Tautan tetap hangus begitu dibuka, berapa pun sisa waktunya.
        </p>
      </div>

      <TombolBuat />
    </form>
  );
}
