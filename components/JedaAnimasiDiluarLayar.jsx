"use client";

import { useEffect } from "react";

// Menandai elemen ber-class `anim-saat-tampil` dengan data-tampil="true" saat
// ada di layar dan "false" saat di luar layar. CSS di styles/globals.css
// memakai penanda itu untuk menjeda animasi berulang (blob latar, lambang
// berputar, titik denyut) sehingga elemen yang belum/tidak terlihat tidak
// bergerak dan tidak membebani HP. Dua arah (bukan sekali saja) karena
// animasi berulang memang perlu berhenti lagi saat digulir keluar layar.
// Komponen ini tidak merender apa pun.
export default function JedaAnimasiDiluarLayar() {
  useEffect(() => {
    const daftar = document.querySelectorAll(".anim-saat-tampil");
    if (typeof IntersectionObserver === "undefined") {
      daftar.forEach((el) => {
        el.dataset.tampil = "true";
      });
      return;
    }
    const io = new IntersectionObserver(
      (entri) => {
        for (const e of entri) {
          e.target.dataset.tampil = e.isIntersecting ? "true" : "false";
        }
      },
      { rootMargin: "80px 0px" }
    );
    daftar.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return null;
}
