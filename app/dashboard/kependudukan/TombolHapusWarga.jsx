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
      className="text-xs font-medium text-red-500 hover:underline disabled:opacity-50"
    >
      {isPending ? "Menghapus..." : "Hapus"}
    </button>
  );
}
