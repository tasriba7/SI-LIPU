"use client";

import { useState, useTransition } from "react";
import { setujuiSemuaPendaftaran } from "./actions";

export default function SetujuiSemua({ jumlahPending }) {
  const [isPending, startTransition] = useTransition();
  const [hasil, setHasil] = useState(null);
  const [error, setError] = useState(null);

  function handleKlik() {
    if (
      !confirm(
        `Setujui semua ${jumlahPending} pendaftaran yang menunggu? Masing-masing akan dapat akun + password acak.`
      )
    ) {
      return;
    }
    setError(null);
    setHasil(null);
    startTransition(async () => {
      const res = await setujuiSemuaPendaftaran();
      if (res?.error) setError(res.error);
      else setHasil(res.hasil);
    });
  }

  if (jumlahPending < 2) return null;

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleKlik}
        disabled={isPending}
        className="rounded-lg border border-navy px-3 py-1.5 text-xs font-medium text-navy hover:bg-navy hover:text-white disabled:opacity-60"
      >
        {isPending ? "Memproses semua..." : `Setujui Semua (${jumlahPending})`}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {hasil && (
        <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-800">
            {hasil.filter((h) => !h.error).length} dari {hasil.length} akun berhasil dibuat.
            Catat/sampaikan sekarang — password tidak ditampilkan lagi setelah ini.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <tbody className="divide-y divide-emerald-100">
                {hasil.map((h, i) => (
                  <tr key={i}>
                    <td className="py-1 pr-4 text-emerald-800">{h.nama}</td>
                    <td className="py-1 pr-4 text-emerald-700">{h.email || "-"}</td>
                    <td className="py-1 pr-4 font-mono text-emerald-700">
                      {h.tempPassword || `Gagal: ${h.error}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
