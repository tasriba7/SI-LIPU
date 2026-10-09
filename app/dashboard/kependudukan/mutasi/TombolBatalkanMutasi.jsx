"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { batalkanMutasi } from "./actions";

export default function TombolBatalkanMutasi({ id, nama }) {
  const [pending, mulai] = useTransition();
  const router = useRouter();

  function klik() {
    const alasan = window.prompt(
      `Batalkan catatan untuk "${nama}"? Penduduk ini akan berstatus aktif lagi dan dihitung kembali.\n\nTulis alasan pembatalan:`
    );
    if (alasan === null) return;
    if (alasan.trim().length < 3) {
      alert("Alasan pembatalan wajib diisi.");
      return;
    }
    mulai(async () => {
      const r = await batalkanMutasi(id, alasan);
      if (r?.error) {
        alert(r.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={klik}
      disabled={pending}
      className="text-[12px] font-medium text-red-500 hover:underline disabled:opacity-50"
    >
      {pending ? "Membatalkan..." : "Batalkan"}
    </button>
  );
}
