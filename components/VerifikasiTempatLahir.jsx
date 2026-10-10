"use client";

import { useState, useTransition } from "react";

/**
 * Langkah verifikasi tempat lahir (faktor ketiga setelah NIK + tanggal lahir).
 * Menampilkan pilihan bertanda inisial; salah 3 kali -> dibatalkan oleh SERVER
 * (komponen ini hanya menampilkan, penghitungan ada di server).
 *
 * Props:
 *  - opsi:      daftar pilihan tersamar dari server, mis. ["T***K***I", ...]
 *  - sisaAwal:  sisa kesempatan salah dari server
 *  - periksa:   async (pilihan) => hasil server { ok | salah+sisa | batal+pesan | kedaluwarsa+pesan | error }
 *  - onSukses:  (hasil) => void   dipanggil saat pilihan benar
 *  - onBatal:   (pesan) => void   dipanggil saat dibatalkan / kedaluwarsa
 */
export default function VerifikasiTempatLahir({ opsi, sisaAwal = 3, periksa, onSukses, onBatal }) {
  const [gugur, setGugur] = useState([]); // pilihan yang sudah terbukti salah
  const [sisa, setSisa] = useState(sisaAwal);
  const [pesan, setPesan] = useState("");
  const [pending, mulai] = useTransition();

  function pilih(p) {
    setPesan("");
    mulai(async () => {
      let r;
      try {
        r = await periksa(p);
      } catch {
        setPesan("Verifikasi belum bisa diproses. Coba lagi.");
        return;
      }
      if (r?.ok) return onSukses(r);
      if (r?.batal || r?.kedaluwarsa) return onBatal(r.pesan);
      if (r?.salah) {
        setGugur((g) => [...g, p]);
        setSisa(r.sisa);
        setPesan(`Belum tepat. Sisa kesempatan: ${r.sisa}.`);
        return;
      }
      setPesan(r?.error || "Verifikasi belum bisa diproses. Coba lagi.");
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div>
        <p className="text-sm font-semibold text-slate-700">Verifikasi tempat lahir</p>
        <p className="mt-1 text-xs text-slate-500">
          Pilih tempat lahir Anda yang benar. Yang terlihat hanya inisialnya (huruf ke-1, ke-5,
          ke-9, dst.), huruf lainnya diganti bintang. Anda punya {sisa} kesempatan salah.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {opsi.map((o) => {
          const salah = gugur.includes(o);
          return (
            <button
              key={o}
              type="button"
              disabled={pending || salah}
              onClick={() => pilih(o)}
              className={`rounded-lg border px-3 py-2.5 font-mono text-sm tracking-widest transition ${
                salah
                  ? "border-red-200 bg-red-50 text-red-300 line-through"
                  : "border-slate-300 bg-white text-slate-700 hover:border-navy hover:text-navy disabled:opacity-60"
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>

      {pending && <p className="text-xs text-slate-500">Memeriksa...</p>}
      {pesan && !pending && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{pesan}</p>
      )}
    </div>
  );
}
