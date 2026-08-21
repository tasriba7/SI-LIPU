"use client";

// Sengaja diletakkan di dalam route group "(publik)" (bukan di app/
// root) supaya animasi transisi ini HANYA membungkus konten halaman
// (children dari app/(publik)/layout.js), TIDAK ikut membungkus
// <PublicHeader /> yang dirender di layout.js — jadi header tetap diam
// di tempat, cuma konten di bawahnya yang fade-in setiap pindah halaman
// (beranda -> galeri -> cek status, dst).
export default function PublikTemplate({ children }) {
  return <div className="animate-pageIn">{children}</div>;
}
