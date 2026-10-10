"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ubahStatusBerita, hapusBerita } from "./actions";

export default function TombolAksiBerita({ id, judul, terbit }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function jalankan(fn) {
    startTransition(async () => {
      const hasil = await fn();
      if (hasil?.error) alert(hasil.error);
      else router.refresh();
    });
  }
  const kelas = "text-xs font-medium hover:underline disabled:opacity-50";

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => jalankan(() => ubahStatusBerita(id, !terbit))}
        className={`${kelas} text-slate-600`}
      >
        {terbit ? "Tarik jadi draf" : "Terbitkan"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm(`Hapus berita "${judul}"? Tindakan ini tidak bisa dibatalkan.`)) return;
          jalankan(() => hapusBerita(id));
        }}
        className={`${kelas} text-red-500`}
      >
        {pending ? "Memproses..." : "Hapus"}
      </button>
    </div>
  );
}
