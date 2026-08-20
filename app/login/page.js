"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { login } from "./actions";

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

export default function LoginPage() {
  const [state, formAction] = useActionState(login, {});

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-center text-xl font-bold text-navy">
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
    </main>
  );
}
