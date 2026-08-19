"use client";

import { useTransition } from "react";
import { kosongkanSlot } from "./actions";

export default function TombolKosongkanSlot({ id }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm("Kosongkan slot ini? Pemegang saat ini akan dilepas dari posisi.")) {
      return;
    }
    const fd = new FormData();
    fd.set("id", id);
    startTransition(() => kosongkanSlot(null, fd));
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="text-xs font-medium text-red-500 hover:underline disabled:opacity-50"
    >
      {isPending ? "Memproses..." : "Kosongkan Slot"}
    </button>
  );
}
