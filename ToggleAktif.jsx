"use client";

import { useState, useTransition } from "react";
import { toggleAktifJenisLayanan } from "./actions";

export default function ToggleAktif({ id, aktif }) {
  const [isAktif, setIsAktif] = useState(aktif);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const nilaiBaru = !isAktif;
    setIsAktif(nilaiBaru); // optimistic
    startTransition(async () => {
      const res = await toggleAktifJenisLayanan(id, nilaiBaru);
      if (res?.error) {
        setIsAktif(!nilaiBaru); // rollback kalau gagal
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className={`rounded-full px-2.5 py-1 text-xs font-medium transition disabled:opacity-50 ${
        isAktif ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
      }`}
    >
      {isAktif ? "Aktif" : "Nonaktif"}
    </button>
  );
}
