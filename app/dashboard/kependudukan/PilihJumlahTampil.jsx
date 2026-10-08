"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Dropdown jumlah data yang ditampilkan. Setiap opsi membawa href sendiri
 * (sudah memuat pencarian & filter yang aktif) sehingga cukup pindah URL.
 */
export default function PilihJumlahTampil({ nilai, opsi }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(e) {
    const dipilih = opsi.find((o) => o.value === e.target.value);
    if (!dipilih) return;
    startTransition(() => {
      router.push(dipilih.href, { scroll: false });
    });
  }

  return (
    <label className="flex items-center gap-1.5 text-xs text-slate-500">
      <span>Tampilkan</span>
      <select
        value={nilai}
        onChange={handleChange}
        disabled={isPending}
        className="rounded-md border border-slate-300 bg-white py-1 pl-2 pr-6 text-xs font-medium text-slate-700 outline-none focus:border-navy disabled:opacity-60"
      >
        {opsi.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
