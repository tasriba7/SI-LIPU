"use client";

import { useTransition, useState } from "react";
import { hapusSlot } from "./actions";

export default function TombolHapusSlot({ id }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function handleClick() {
    if (!confirm("Hapus slot ini? Tindakan ini tidak bisa dibatalkan.")) {
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      const result = await hapusSlot(null, fd);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="text-xs font-medium text-red-500 hover:underline disabled:opacity-50"
      >
        {isPending ? "Menghapus..." : "Hapus"}
      </button>
      {error && <p className="mt-1 max-w-[200px] text-xs text-red-600">{error}</p>}
    </div>
  );
}
