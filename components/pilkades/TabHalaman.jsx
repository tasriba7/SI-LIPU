"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconKunci } from "./UI";
import TombolTerkunci from "./TombolTerkunci";

/**
 * Tab untuk menu gabungan (mis. Pengaturan Panitia, Hari Pemungutan).
 * Tiap tab adalah halaman sendiri (alamat sendiri), jadi tombol Kembali, muat ulang,
 * dan tautan tersimpan tetap bekerja. Tab terkunci membuka pesan penjelasan.
 * tab: [{ href, label, kunci? }]  (kunci = objek dari lib/pilkadesKunci.js)
 */
export default function TabHalaman({ judul, tab }) {
  const pathname = usePathname() || "";
  return (
    <div className="mx-auto mb-5 max-w-5xl">
      <p className="text-xs font-bold uppercase tracking-wide text-sky-700">{judul}</p>
      <nav aria-label={judul} className="mt-2 flex gap-1 overflow-x-auto rounded-xl border border-sky-100 bg-white p-1">
        {tab.map((t) => {
          const aktif = pathname === t.href || pathname.startsWith(t.href + "/");
          const dasar = "flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300";
          if (t.kunci) {
            return (
              <TombolTerkunci key={t.href} kunci={t.kunci} className={`${dasar} text-slate-500 hover:bg-slate-50`}>
                {t.label}
                <IconKunci className="h-4 w-4 text-amber-600" />
                <span className="sr-only">(terkunci)</span>
              </TombolTerkunci>
            );
          }
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={aktif ? "page" : undefined}
              className={`${dasar} ${aktif ? "bg-sky-600 text-white shadow-sm" : "text-sky-900 hover:bg-sky-50"}`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
