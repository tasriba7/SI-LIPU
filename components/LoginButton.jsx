"use client";

import { useState } from "react";
import LoginModal from "@/components/LoginModal";

/**
 * Tombol/link "Login" yang membuka LoginModal sebagai popup, alih-alih
 * pindah ke route /login. Halaman di belakangnya (beranda) tetap tampil.
 *
 * Dipakai di PublicHeader (desktop + mobile) dan footer beranda — tiap
 * instance mengelola state buka/tutupnya sendiri-sendiri.
 */
export default function LoginButton({ className, onOpen, children }) {
  const [open, setOpen] = useState(false);

  function handleOpen() {
    setOpen(true);
    onOpen?.(); // contoh: tutup menu mobile saat modal dibuka
  }

  return (
    <>
      <button type="button" onClick={handleOpen} className={className}>
        {children}
      </button>
      <LoginModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
