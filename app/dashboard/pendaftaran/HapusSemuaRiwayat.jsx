"use client";

import { useState, useTransition } from "react";
import { hapusSemuaRiwayatPendaftaran } from "./actions";

export default function HapusSemuaRiwayat({ jumlah }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function handleKlik() {
    if (
      !confirm(
        `Hapus semua ${jumlah} riwayat pendaftaran? Akun yang sudah dibuat tidak ikut terhapus.`
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await hapusSemuaRiwayatPendaftaran();
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleKlik}
        disabled={isPending}
        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
      >
        {isPending ? "Menghapus..." : `Hapus Semua Riwayat (${jumlah})`}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
