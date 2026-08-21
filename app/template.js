"use client";

// `template.js` adalah fitur bawaan Next.js App Router: berbeda dari
// layout.js (yang tetap dipakai ulang/tidak remount saat pindah halaman),
// template.js selalu dibuat ulang setiap kali route berpindah — jadi pas
// dipakai untuk animasi transisi antar halaman (lihat dokumentasi resmi
// Next.js bagian "template.js").
//
// Sebelumnya perpindahan antar halaman terasa "keras" karena kontennya
// langsung berganti tanpa transisi apapun. Wrapper ini bikin konten
// halaman baru fade-in + geser tipis ke atas (animasi "pageIn" di
// tailwind.config.js), durasinya sengaja singkat (0.28 detik) supaya
// terasa halus tapi tetap responsif, tidak bikin pengguna menunggu.
export default function Template({ children }) {
  return <div className="animate-pageIn">{children}</div>;
}
