"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { batalkanTautanData } from "./actions";

export default function TombolBatalkan({ id, instansi }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    if (
      !confirm(
        `Batalkan tautan untuk "${instansi}"? Tautan ini tidak bisa dibuka lagi oleh penerima.`
      )
    )
      return;

    const fd = new FormData();
    fd.set("id", id);

    startTransition(async () => {
      const hasil = await batalkanTautanData(null, fd);
      if (hasil?.error) {
        alert(hasil.error);
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="text-[12px] font-medium text-red-500 hover:underline disabled:opacity-50"
    >
      {isPending ? "Membatalkan..." : "Batalkan"}
    </button>
  );
}
