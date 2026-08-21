"use client";

// Sama seperti app/(publik)/template.js — diletakkan di dalam
// app/dashboard/ (bukan di app/ root) supaya animasi ini HANYA
// membungkus konten dashboard (children dari app/dashboard/layout.js),
// TIDAK ikut membungkus sidebar/header (DashboardShell) yang dirender
// di layout.js — jadi sidebar tetap diam, cuma konten yang fade-in
// setiap pindah menu.
export default function DashboardTemplate({ children }) {
  return <div className="animate-pageIn">{children}</div>;
}
