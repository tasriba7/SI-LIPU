"use client";

import { useState } from "react";
import { masukkanKeTps } from "../actions";
import { tombol, kolomKecil } from "@/components/pilkades/UI";

// baris: [{ id, nama, nik, umur, dusun, rtrw, tpsNama }]
export default function TabelTempatkan({ baris, tpsList, periodeId, bisaUbah }) {
  const [dipilih, setDipilih] = useState(() => new Set());
  const semuaDipilih = baris.length > 0 && baris.every((b) => dipilih.has(b.id));

  function toggle(id) {
    setDipilih((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  function toggleSemua() {
    setDipilih(semuaDipilih ? new Set() : new Set(baris.map((b) => b.id)));
  }

  return (
    <form action={masukkanKeTps} className="space-y-3">
      <input type="hidden" name="periode_id" value={periodeId} />
      <input type="hidden" name="mode" value="terpilih" />
      {[...dipilih].map((id) => <input key={id} type="hidden" name="ids" value={id} />)}

      <div className="overflow-x-auto rounded-xl border border-sky-100 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-sky-50 text-sm font-bold text-sky-900">
            <tr>
              {bisaUbah && (
                <th className="w-12 px-4 py-3">
                  <input type="checkbox" checked={semuaDipilih} onChange={toggleSemua} aria-label="Pilih semua di halaman ini" className="h-5 w-5" />
                </th>
              )}
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Umur</th>
              <th className="px-4 py-3">Dusun, RT/RW</th>
              <th className="px-4 py-3">TPS saat ini</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {baris.map((b) => (
              <tr key={b.id} className={dipilih.has(b.id) ? "bg-sky-50" : ""}>
                {bisaUbah && (
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={dipilih.has(b.id)} onChange={() => toggle(b.id)} aria-label={`Pilih ${b.nama}`} className="h-5 w-5" />
                  </td>
                )}
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">{b.nama}</p>
                  <p className="text-sm text-slate-500">NIK {b.nik}</p>
                </td>
                <td className="px-4 py-3">{b.umur ?? "-"}</td>
                <td className="px-4 py-3 text-slate-800">{b.dusun ?? "-"}<br />{b.rtrw}</td>
                <td className="px-4 py-3">
                  {b.tpsNama ? (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">{b.tpsNama}</span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">Belum punya TPS</span>
                  )}
                </td>
              </tr>
            ))}
            {!baris.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Tidak ada nama yang cocok.</td></tr>}
          </tbody>
        </table>
      </div>

      {bisaUbah && (
        <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-sky-300 bg-white p-4 shadow-lg">
          <p className="text-sm font-bold text-sky-950">
            {dipilih.size > 0 ? `${dipilih.size} orang dipilih` : "Centang nama di atas, lalu pilih TPS"}
          </p>
          <select name="tps_id" required defaultValue="" className={`${kolomKecil} min-w-[10rem]`} aria-label="TPS tujuan">
            <option value="" disabled>Pilih TPS…</option>
            {tpsList.map((t) => <option key={t.id} value={t.id}>{t.nama}</option>)}
          </select>
          <button disabled={dipilih.size === 0} className={tombol.hijau}>Masukkan ke TPS ini</button>
          {dipilih.size > 0 && (
            <button type="button" onClick={() => setDipilih(new Set())} className="text-sm font-semibold text-slate-600 underline">
              Batalkan pilihan
            </button>
          )}
        </div>
      )}
    </form>
  );
}
