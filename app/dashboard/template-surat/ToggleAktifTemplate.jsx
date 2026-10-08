"use client";

import { useState, useTransition } from "react";
import { toggleAktifTemplate } from "./actions";

export default function ToggleAktifTemplate({ id, aktif }) {
  const [isAktif, setIsAktif] = useState(aktif);
  const [pending, mulai] = useTransition();

  function ganti() {
    const baru = !isAktif;
    setIsAktif(baru);
    mulai(async () => {
      const r = await toggleAktifTemplate(id, baru);
      if (r?.error) setIsAktif(!baru);
    });
  }

  return (
    <button
      type="button"
      onClick={ganti}
      disabled={pending}
      className={`rounded-full px-2.5 py-1 text-xs font-medium transition disabled:opacity-50 ${
        isAktif ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
      }`}
    >
      {isAktif ? "Aktif" : "Nonaktif"}
    </button>
  );
}
