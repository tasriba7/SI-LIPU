"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { login } from "@/app/login/actions";
import { IconClose } from "@/components/icons";

function TombolLogin() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-navy py-2.5 font-medium text-white transition hover:bg-navy-light disabled:opacity-60"
    >
      {pending ? "Memproses..." : "Masuk"}
    </button>
  );
}

/**
 * Popup form login (admin/petugas desa) yang tampil di atas halaman
 * apapun tanpa pindah route — beranda tetap render di belakangnya.
 * Bisa ditutup lewat tombol X, klik area luar (backdrop), atau tombol Esc.
 *
 * Login sukses tetap redirect ke /dashboard seperti biasa (server action
 * `login` di app/login/actions.js yang menangani ini).
 */
export default function LoginModal({ open, onClose }) {
  const [state, formAction] = useFormState(login, {});

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    const scrollSebelumnya = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = scrollSebelumnya;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    // Overlay: scrollable sendiri (overflow-y-auto) supaya kalau tinggi
    // modal + posisi keyboard (di HP) melebihi tinggi layar yang terlihat,
    // kontennya tetap bisa dijangkau lewat scroll — bukan terpotong/hilang
    // di luar viewport seperti sebelumnya. Wrapper kedua (min-h-full +
    // items-center) yang melakukan centering, bukan si overlay langsung.
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-navy-dark/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center px-4 py-8">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-modal-title"
          className="relative w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <IconClose className="h-5 w-5" />
          </button>

          <h1
            id="login-modal-title"
            className="text-center text-xl font-bold text-navy"
          >
            Beranda Login
          </h1>
          <p className="mb-6 mt-1 text-center text-sm text-slate-500">
            Masukkan Username dan Password anda.
          </p>

          <form action={formAction} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-slate-600">
                Email
              </label>
              <input
                type="email"
                name="email"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-navy"
                placeholder="nama@email.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-600">
                Kata sandi
              </label>
              <input
                type="password"
                name="password"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-navy"
                placeholder="••••••••"
              />
            </div>

            {state?.error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {state.error}
              </p>
            )}

            <TombolLogin />
          </form>
        </div>
      </div>
    </div>
  );
}
