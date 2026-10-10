"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Form pencarian/filter (metode GET) yang berpindah halaman TANPA memuat ulang
 * seluruh aplikasi. <form> biasa memicu reload penuh browser, yang membuat
 * layar pembuka (logo) muncul lagi dan sidebar ikut dimuat ulang. Di sini
 * isian form diubah jadi query string lalu dipindahkan lewat router Next.js,
 * jadi hanya area konten yang berganti.
 */
export default function FormCari({ children, className }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, mulai] = useTransition();

  function kirim(e) {
    e.preventDefault();
    const q = new URLSearchParams();
    for (const [k, v] of new FormData(e.currentTarget).entries()) {
      const teks = String(v).trim();
      if (teks) q.set(k, teks);
    }
    const qs = q.toString();
    mulai(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  return (
    <form onSubmit={kirim} className={className} aria-busy={pending}>
      {children}
      {pending && <span className="text-xs text-slate-400">Mencari...</span>}
    </form>
  );
}
