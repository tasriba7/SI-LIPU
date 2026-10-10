"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ubahTampilPenerima } from "./actions";

// Saklar "Tampil ke warga" untuk satu penerima.
export default function TombolTampil({ id, tampil }) {
  const [aktif, setAktif] = useState(tampil);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleToggle() {
    const nilaiBaru = !aktif;
    setAktif(nilaiBaru); // optimistic
    startTransition(async () => {
      const res = await ubahTampilPenerima(id, nilaiBaru);
      if (res?.error) {
        setAktif(!nilaiBaru); // rollback kalau gagal
        alert(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      aria-pressed={aktif}
      title={aktif ? "Klik untuk sembunyikan dari warga" : "Klik untuk tampilkan ke warga"}
      className={`rounded-full px-2.5 py-1 text-xs font-medium transition disabled:opacity-50 ${
        aktif ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
      }`}
    >
      {aktif ? "Tampil" : "Disembunyikan"}
    </button>
  );
}
