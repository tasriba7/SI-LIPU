"use client";

import { useState, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { simpanJadwal } from "../actions";
import { Pesan, tombol, kolomKecil } from "@/components/pilkades/UI";

function TombolSimpan() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className={`${tombol.utama} text-base`}>
      {pending ? "Menyimpan..." : "Simpan jadwal"}
    </button>
  );
}

/**
 * Satu formulir untuk seluruh tahapan. `baris` = tahapan yang bisa diisi (tanpa pemungutan),
 * `awal` = { [kunci]: { mulai, selesai, catatan } } dari data tersimpan.
 * `pemungutan` = baris tetap (tanggal dari Periode) yang hanya ditampilkan.
 */
export default function FormJadwal({ periodeId, baris, awal, pemungutan, tautanPeriode }) {
  const [state, formAction] = useActionState(simpanJadwal, {});
  const [nilai, setNilai] = useState(() =>
    Object.fromEntries(baris.map((b) => [b.kunci, { mulai: awal[b.kunci]?.mulai ?? "", selesai: awal[b.kunci]?.selesai ?? "", catatan: awal[b.kunci]?.catatan ?? "" }]))
  );
  const ubah = (kunci, kolomNama, v) => setNilai((n) => ({ ...n, [kunci]: { ...n[kunci], [kolomNama]: v } }));
  const terisi = Object.values(nilai).filter((v) => v.mulai).length;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="periode_id" value={periodeId} />

      <ol className="space-y-3">
        {baris.map((b) => {
          const v = nilai[b.kunci];
          const salah = v.mulai && v.selesai && v.selesai < v.mulai;
          return (
            <li key={b.kunci} className={`rounded-xl border bg-white p-4 ${salah ? "border-red-300" : "border-sky-100"}`}>
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-800">{b.no}</span>
                <div className="min-w-0">
                  <p className="text-base font-bold text-slate-900">{b.nama}</p>
                  <p className="text-sm text-slate-600">{b.arti}</p>
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.4fr]">
                <label className="block text-sm font-semibold text-slate-800">
                  Mulai
                  <input type="date" name={`mulai_${b.kunci}`} value={v.mulai} onChange={(e) => ubah(b.kunci, "mulai", e.target.value)} className={`${kolomKecil} mt-1 block w-full font-normal`} />
                </label>
                <label className="block text-sm font-semibold text-slate-800">
                  Selesai <span className="font-normal text-slate-500">(kosong = 1 hari)</span>
                  <input type="date" name={`selesai_${b.kunci}`} value={v.selesai} min={v.mulai || undefined} onChange={(e) => ubah(b.kunci, "selesai", e.target.value)} className={`${kolomKecil} mt-1 block w-full font-normal`} />
                </label>
                <label className="block text-sm font-semibold text-slate-800 sm:col-span-2 lg:col-span-1">
                  Catatan <span className="font-normal text-slate-500">(boleh kosong)</span>
                  <input name={`catatan_${b.kunci}`} value={v.catatan} maxLength={200} onChange={(e) => ubah(b.kunci, "catatan", e.target.value)} placeholder="Misal: di Balai Desa, pukul 09.00" className={`${kolomKecil} mt-1 block w-full font-normal`} />
                </label>
              </div>
              {salah && <p role="alert" className="mt-2 text-sm font-semibold text-red-700">Tanggal selesai lebih awal dari tanggal mulai.</p>}
              {(v.mulai || v.selesai) && (
                <button type="button" onClick={() => setNilai((n) => ({ ...n, [b.kunci]: { mulai: "", selesai: "", catatan: "" } }))} className="mt-2 text-sm font-semibold text-slate-600 underline hover:text-slate-900">
                  Kosongkan tanggal tahap ini
                </button>
              )}
            </li>
          );
        })}
      </ol>

      {pemungutan && (
        <div className="rounded-xl border border-dashed border-sky-300 bg-sky-50 p-4">
          <p className="text-base font-bold text-slate-900">Pemungutan & Penghitungan Suara</p>
          <p className="text-sm font-semibold text-sky-900">{pemungutan.mulai ? `📅 ${pemungutan.rentang}` : "Tanggal belum diisi"}</p>
          <p className="mt-1 text-sm text-slate-700">
            Tanggal hari pemungutan diatur oleh Administrator di menu <b>Periode Pilkades</b>, jadi tidak diisi di sini.{" "}
            {tautanPeriode && <a href="/dashboard/pilkades/periode" className="font-bold text-sky-800 underline">Buka Periode →</a>}
          </p>
        </div>
      )}

      {state?.error && <Pesan jenis="bahaya" judul="Jadwal belum tersimpan">{state.error}</Pesan>}

      <div className="sticky bottom-3 flex flex-wrap items-center gap-3 rounded-xl border border-sky-100 bg-white/95 p-3 shadow-md backdrop-blur">
        <TombolSimpan />
        <p className="text-sm text-slate-700">{terisi} dari {baris.length} tahapan sudah ada tanggalnya.</p>
      </div>
    </form>
  );
}
