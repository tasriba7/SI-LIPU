"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import IsiKunci from "./IsiKunci";

/**
 * Tombol untuk tahap yang terkunci. Bila diklik membuka jendela pesan yang
 * menjelaskan apa yang harus dikerjakan lebih dulu. `className` mengatur tampilan tombol.
 * Jendela dipasang di <body> (portal) karena menu samping memakai transform,
 * yang membuat elemen "fixed" di dalamnya salah posisi.
 */
export default function TombolTerkunci({ kunci, className = "", children }) {
  const [buka, setBuka] = useState(false);
  const [siap, setSiap] = useState(false);

  useEffect(() => setSiap(true), []);

  useEffect(() => {
    if (!buka) return;
    const tutupDenganEsc = (e) => e.key === "Escape" && setBuka(false);
    document.addEventListener("keydown", tutupDenganEsc);
    const awal = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", tutupDenganEsc);
      document.body.style.overflow = awal;
    };
  }, [buka]);

  return (
    <>
      <button
        type="button"
        onClick={() => setBuka(true)}
        aria-haspopup="dialog"
        title="Tahap ini terkunci. Klik untuk melihat alasannya."
        className={className}
      >
        {children}
      </button>

      {buka &&
        siap &&
        createPortal(
          <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-3 sm:items-center" onClick={() => setBuka(false)}>
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`${kunci.nama} masih terkunci`}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
            >
              <IsiKunci kunci={kunci} onPilih={() => setBuka(false)} />
              <button
                type="button"
                autoFocus
                onClick={() => setBuka(false)}
                className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
              >
                Mengerti, tutup
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
