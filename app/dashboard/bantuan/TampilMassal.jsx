"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ubahTampilMassal } from "./actions";

// Tombol "Tampilkan semua / Sembunyikan semua" untuk satu program
// (jenis bantuan + periode).
export default function TampilMassal({ jenisId, periode, nama, jumlah }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function ubah(tampilBaru) {
    const aksi = tampilBaru ? "TAMPILKAN" : "SEMBUNYIKAN";
    const ok = confirm(
      `${aksi} semua ${jumlah} penerima "${nama}" ${
        tampilBaru ? "ke warga di halaman Cek Bantuan" : "dari halaman Cek Bantuan"
      }?`
    );
    if (!ok) return;

    startTransition(async () => {
      const res = await ubahTampilMassal(jenisId, periode, tampilBaru);
      if (res?.error) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => ubah(true)}
        disabled={isPending}
        className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
      >
        Tampilkan semua
      </button>
      <button
        type="button"
        onClick={() => ubah(false)}
        disabled={isPending}
        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
      >
        Sembunyikan semua
      </button>
    </div>
  );
}
