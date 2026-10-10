"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { hapusWarga } from "./actions";

export default function TombolHapusWarga({ id, nama }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    const konfirmasi = confirm(
      `Hapus data warga "${nama}"? Tindakan ini tidak bisa dibatalkan.`
    );
    if (!konfirmasi) return;

    const fd = new FormData();
    fd.set("id", id);

    startTransition(async () => {
      const hasil = await hapusWarga(null, fd);
      if (hasil?.error) {
        alert(hasil.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="rounded-md bg-red-50 px-2 py-1 text-[12px] font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
    >
      {isPending ? "Menghapus..." : "Hapus"}
    </button>
  );
}
