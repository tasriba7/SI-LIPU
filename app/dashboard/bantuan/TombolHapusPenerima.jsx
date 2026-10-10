"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { hapusPenerimaBantuan } from "./actions";

export default function TombolHapusPenerima({ id, nama, bantuan }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    const ok = confirm(
      `Hapus ${nama} dari penerima "${bantuan}"? Tindakan ini tidak bisa dibatalkan.`
    );
    if (!ok) return;

    const fd = new FormData();
    fd.set("id", id);

    startTransition(async () => {
      const hasil = await hapusPenerimaBantuan(null, fd);
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
