"use client";

import { useState, useTransition } from "react";
import { setujuiPendaftaran, tolakPendaftaran } from "./actions";
import { ROLE_LABELS } from "@/lib/roles";

export default function BarisPendaftaran({ pendaftaran }) {
  const [isPending, startTransition] = useTransition();
  const [hasil, setHasil] = useState(null);
  const [error, setError] = useState(null);

  function handleSetujui() {
    setError(null);
    const fd = new FormData();
    fd.set("pendaftaran_id", pendaftaran.id);
    startTransition(async () => {
      const res = await setujuiPendaftaran(null, fd);
      if (res?.error) setError(res.error);
      else setHasil(res);
    });
  }

  function handleTolak() {
    const catatan = prompt("Alasan penolakan (opsional):") || "";
    const fd = new FormData();
    fd.set("pendaftaran_id", pendaftaran.id);
    fd.set("catatan_admin", catatan);
    startTransition(async () => {
      const res = await tolakPendaftaran(null, fd);
      if (res?.error) setError(res.error);
    });
  }

  if (hasil?.success) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
        <p className="font-medium text-emerald-800">Akun berhasil dibuat.</p>
        <p className="mt-1 text-emerald-700">
          Email: <span className="font-mono">{hasil.email}</span>
        </p>
        <p className="text-emerald-700">
          Password sementara: <span className="font-mono">{hasil.tempPassword}</span>
        </p>
        <p className="mt-2 text-xs text-emerald-600">
          Sampaikan kredensial ini ke yang bersangkutan lewat jalur aman
          (bukan chat publik), dan minta ganti password saat login pertama.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-slate-800">{pendaftaran.nama_lengkap}</p>
          <p className="text-sm text-slate-500">
            {ROLE_LABELS[pendaftaran.posisi_perangkat?.role]} — {pendaftaran.posisi_perangkat?.wilayah}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            NIK: {pendaftaran.nik} · HP: {pendaftaran.no_hp} · {pendaftaran.email}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSetujui}
            disabled={isPending}
            className="rounded-lg bg-navy px-3 py-1.5 text-xs font-medium text-white hover:bg-navy-light disabled:opacity-60"
          >
            {isPending ? "Memproses..." : "Setujui"}
          </button>
          <button
            type="button"
            onClick={handleTolak}
            disabled={isPending}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            Tolak
          </button>
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
