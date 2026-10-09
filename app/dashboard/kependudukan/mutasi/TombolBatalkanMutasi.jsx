"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { batalkanMutasi } from "./actions";

// Akibat pembatalan berbeda per jenis catatan.
const AKIBAT = {
  meninggal: "Penduduk ini akan berstatus aktif lagi dan dihitung kembali.",
  pindah_keluar: "Penduduk ini akan berstatus aktif lagi dan dihitung kembali.",
  datang: "Penduduk ini akan dikeluarkan lagi dari jumlah penduduk (status pindah keluar).",
};

export default function TombolBatalkanMutasi({ id, nama, jenis }) {
  const [pending, mulai] = useTransition();
  const router = useRouter();

  function klik() {
    const alasan = window.prompt(
      `Batalkan catatan untuk "${nama}"? ${AKIBAT[jenis] || AKIBAT.meninggal}\n\nTulis alasan pembatalan:`
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
