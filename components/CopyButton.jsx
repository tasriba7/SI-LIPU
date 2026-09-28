"use client";

import { useState } from "react";

/**
 * Tombol "Salin" ke clipboard. Dipakai untuk password yang hanya tampil
 * sekali (hasil atur ulang password / persetujuan akun).
 */
export default function CopyButton({ text, label = "Salin", className = "" }) {
  const [tersalin, setTersalin] = useState(false);

  async function handleSalin() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setTersalin(true);
      setTimeout(() => setTersalin(false), 2000);
    } catch {
      alert("Gagal menyalin otomatis. Silakan salin manual.");
    }
  }

  return (
    <button
      type="button"
      onClick={handleSalin}
      className={`rounded border border-emerald-300 bg-white px-2 py-0.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 ${className}`}
    >
      {tersalin ? "Tersalin ✓" : label}
    </button>
  );
}
