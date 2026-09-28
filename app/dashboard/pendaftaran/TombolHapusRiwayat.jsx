"use client";

import { useState, useTransition } from "react";
import { hapusRiwayatPendaftaran } from "./actions";

export default function TombolHapusRiwayat({ id, nama }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function handleHapus() {
    if (!confirm(`Hapus riwayat pendaftaran ${nama}? Akun yang sudah dibuat tidak ikut terhapus.`)) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await hapusRiwayatPendaftaran(id);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleHapus}
        disabled={isPending}
        className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
      >
        {isPending ? "Menghapus..." : "Hapus"}
      </button>
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  );
}
