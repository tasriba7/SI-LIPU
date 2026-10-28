"use client";

import { useFormStatus } from "react-dom";
import { EVENT_AMBIL_WARGA } from "./AnimasiAmbilWarga";

/**
 * Tombol submit untuk form ambilCalonPemilih. Saat diklik ia hanya memberi
 * sinyal ke <AnimasiAmbilWarga/> (yang dipasang sekali di halaman) dan
 * menonaktifkan dirinya agar tidak terklik dua kali.
 * Harus berada DI DALAM <form> supaya useFormStatus bekerja.
 */
export default function TombolAmbilWarga({ className, children }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={className}
      onClick={() => window.dispatchEvent(new Event(EVENT_AMBIL_WARGA))}
    >
      {children}
    </button>
  );
}
