"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ubahStatusWisata, hapusWisata } from "./actions";

// Tombol kecil di tiap kartu wisata: sembunyikan/tampilkan, unggulan, hapus.
export default function TombolAksiWisata({ id, nama, aktif, unggulan }) {
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
        onClick={() => jalankan(() => ubahStatusWisata(id, "aktif", !aktif))}
        className={`${kelas} text-slate-600`}
      >
        {aktif ? "Sembunyikan" : "Tampilkan"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => jalankan(() => ubahStatusWisata(id, "unggulan", !unggulan))}
        className={`${kelas} text-amber-600`}
      >
        {unggulan ? "Lepas unggulan" : "Jadikan unggulan"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm(`Hapus wisata "${nama}"? Tindakan ini tidak bisa dibatalkan.`)) return;
          jalankan(() => hapusWisata(id));
        }}
        className={`${kelas} text-red-500`}
      >
        {pending ? "Memproses..." : "Hapus"}
      </button>
    </div>
  );
}
