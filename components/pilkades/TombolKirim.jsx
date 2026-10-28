"use client";

import { useFormStatus } from "react-dom";

/**
 * Tombol kirim untuk formulir server action.
 * Terkunci selama proses berjalan, jadi klik/ketuk dua kali tidak menyimpan data dobel.
 * Pakai di dalam <form action={...}>.
 */
export default function TombolKirim({ children, className = "", teksProses = "Menyimpan..." }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${className} w-full disabled:cursor-wait disabled:opacity-60 sm:w-auto`}
    >
      {pending ? teksProses : children}
    </button>
  );
}
