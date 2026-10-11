"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ubahAktifStruktur, geserStruktur, hapusStruktur } from "./actions";

// Tombol kecil di tiap baris: geser kiri/kanan, sembunyikan/tampilkan, hapus.
export default function TombolAksiStruktur({ id, nama, aktif, bisaKiri, bisaKanan }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function jalankan(fn) {
    startTransition(async () => {
      const hasil = await fn();
      if (hasil?.error) alert(hasil.error);
      else router.refresh();
    });
  }

  const kelas = "text-xs font-medium hover:underline disabled:opacity-40 disabled:no-underline";

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <button
        type="button"
        disabled={pending || !bisaKiri}
        onClick={() => jalankan(() => geserStruktur(id, "naik"))}
        className={`${kelas} text-slate-600`}
        title="Geser ke kiri di bagan"
      >
        &larr; Kiri
      </button>
      <button
        type="button"
        disabled={pending || !bisaKanan}
        onClick={() => jalankan(() => geserStruktur(id, "turun"))}
        className={`${kelas} text-slate-600`}
        title="Geser ke kanan di bagan"
      >
        Kanan &rarr;
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => jalankan(() => ubahAktifStruktur(id, !aktif))}
        className={`${kelas} text-amber-600`}
      >
        {aktif ? "Sembunyikan" : "Tampilkan"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm(`Hapus "${nama}" dari struktur organisasi? Tindakan ini tidak bisa dibatalkan.`)) return;
          jalankan(() => hapusStruktur(id));
        }}
        className={`${kelas} text-red-500`}
      >
        {pending ? "Memproses..." : "Hapus"}
      </button>
    </div>
  );
}
