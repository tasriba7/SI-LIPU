"use client";

import { useEffect, useRef } from "react";

// Latar hero berupa beberapa foto yang bergeser bergantian tiap 10 detik.
// - Arah bolak-balik: foto bergeser ke kiri saat maju (1 -> 2 -> 3), lalu
//   bergeser ke kanan saat mundur (3 -> 2 -> 1), dan seterusnya.
// - Gerak halus (ease-in-out 1,6 dtk); foto lama dan baru bergerak bersamaan
//   sehingga tidak ada celah kosong di antaranya.
// - Berhenti saat tab tidak terlihat; hanya satu foto -> tampil statis.
// - "Kurangi gerakan" (prefers-reduced-motion) -> pindah tanpa animasi geser.
const JEDA_MS = 10000;
const DURASI_GESER_MS = 1600;
const EASING = "cubic-bezier(0.65, 0, 0.35, 1)";

export default function HeroSlideshow({ images = [], className = "" }) {
  const jumlah = images.length;
  const slideRef = useRef([]);
  const aktifRef = useRef(0);
  const arahRef = useRef(1); // 1 = maju (geser ke kiri), -1 = mundur (geser ke kanan)
  const sibukRef = useRef(false);

  useEffect(() => {
    if (jumlah < 2) return undefined;

    const kurangiGerak = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const pindah = () => {
      if (sibukRef.current) return;
      let arah = arahRef.current;
      let tujuan = aktifRef.current + arah;
      if (tujuan >= jumlah || tujuan < 0) {
        arah = -arah; // balik arah di ujung daftar
        tujuan = aktifRef.current + arah;
      }
      const lama = slideRef.current[aktifRef.current];
      const baru = slideRef.current[tujuan];
      if (!lama || !baru) return;

      arahRef.current = arah;
      sibukRef.current = true;

      const opsi = {
        duration: kurangiGerak ? 0 : DURASI_GESER_MS,
        easing: EASING,
        fill: "forwards",
      };
      // Foto baru masuk dari sisi arah gerak; foto lama keluar ke sisi sebaliknya.
      const masuk = baru.animate(
        [{ transform: `translateX(${arah * 100}%)` }, { transform: "translateX(0%)" }],
        opsi
      );
      const keluar = lama.animate(
        [{ transform: "translateX(0%)" }, { transform: `translateX(${-arah * 100}%)` }],
        opsi
      );

      masuk.finished
        .then(() => {
          // Simpan posisi akhir ke style, lalu lepas animasinya.
          baru.style.transform = "translateX(0%)";
          lama.style.transform = `translateX(${-arah * 100}%)`;
          masuk.cancel();
          keluar.cancel();
          aktifRef.current = tujuan;
          sibukRef.current = false;
        })
        .catch(() => {
          sibukRef.current = false;
        });
    };

    let timer = null;
    const mulai = () => {
      if (!timer) timer = setInterval(pindah, JEDA_MS);
    };
    const henti = () => {
      clearInterval(timer);
      timer = null;
    };
    const saatVisibilitas = () => (document.hidden ? henti() : mulai());

    // Muat semua foto sejak awal (maks. 10) supaya geseran tidak tersendat.
    images.forEach((img) => {
      const pra = new window.Image();
      pra.src = img.src;
    });

    mulai();
    document.addEventListener("visibilitychange", saatVisibilitas);
    return () => {
      henti();
      document.removeEventListener("visibilitychange", saatVisibilitas);
    };
  }, [jumlah, images]);

  if (jumlah === 0) return null;

  return (
    <div aria-hidden className={`absolute inset-0 overflow-hidden ${className}`}>
      {images.map((img, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={img.src}
          ref={(el) => {
            slideRef.current[i] = el;
          }}
          src={img.src}
          alt=""
          loading={i === 0 ? "eager" : "lazy"}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          // Foto pertama tampil; sisanya menunggu di luar layar (kanan).
          style={{ transform: i === 0 ? "translateX(0%)" : "translateX(100%)" }}
        />
      ))}
    </div>
  );
}
