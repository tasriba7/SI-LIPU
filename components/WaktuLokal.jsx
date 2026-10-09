"use client";

import { useEffect, useState } from "react";

/**
 * Tampilkan waktu sesuai zona waktu PERANGKAT yang membuka halaman (bukan
 * zona server, yang di hosting biasanya UTC). Zona waktu desa tidak
 * di-hardcode, jadi aman dipakai di desa mana pun.
 */
export default function WaktuLokal({ iso, kosong = "-" }) {
  const [teks, setTeks] = useState("");

  useEffect(() => {
    if (!iso) return;
    setTeks(
      new Date(iso).toLocaleString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }, [iso]);

  if (!iso) return <>{kosong}</>;
  return <span suppressHydrationWarning>{teks || "…"}</span>;
}
