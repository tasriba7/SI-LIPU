"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buatTemplate } from "../actions";

const input =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-navy focus:outline-none";

function slugkan(teks) {
  return teks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

export default function FormTambahTemplate({ daftar }) {
  const router = useRouter();
  const [nama, setNama] = useState("");
  const [kode, setKode] = useState("");
  const [kodeManual, setKodeManual] = useState(false);
  const [salinDariId, setSalinDariId] = useState("");
  const [error, setError] = useState(null);
  const [pending, mulai] = useTransition();

  function kirim(e) {
    e.preventDefault();
    setError(null);
    mulai(async () => {
      const r = await buatTemplate({ kode, nama, salinDariId: salinDariId || null });
      if (r?.error) setError(r.error);
      else router.push(`/dashboard/template-surat/${r.id}`);
    });
  }

  return (
    <form onSubmit={kirim} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Nama template</label>
        <input className={input} value={nama} required placeholder="mis. Surat Keterangan Belum Menikah"
          onChange={(e) => {
            setNama(e.target.value);
            if (!kodeManual) setKode(slugkan(e.target.value));
          }} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Kode (unik, tidak bisa diubah)</label>
        <input className={`${input} font-mono`} value={kode} required
          onChange={(e) => {
            setKodeManual(true);
            setKode(slugkan(e.target.value));
          }} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Mulai dari</label>
        <select className={input} value={salinDariId} onChange={(e) => setSalinDariId(e.target.value)}>
          <option value="">Kerangka kosong (biodata dasar)</option>
          {daftar.map((t) => (
            <option key={t.id} value={t.id}>Salin dari: {t.nama}</option>
          ))}
        </select>
      </div>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button disabled={pending}
        className="rounded-lg bg-navy px-5 py-2.5 text-sm font-medium text-white hover:bg-navy-light disabled:opacity-60">
        {pending ? "Membuat..." : "Buat & lanjut edit"}
      </button>
    </form>
  );
}
