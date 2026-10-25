"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Pesan } from "./UI";

const PARAM_STANDAR = ["hasil", "pesan", "nama", "n", "jabatan"];

/**
 * Pesan hasil aksi (berhasil / gagal) setelah formulir dikirim.
 *  - Tampil satu kali: kode pesan dihapus dari alamat halaman, jadi memuat ulang
 *    halaman tidak memunculkannya lagi.
 *  - Bisa ditutup dengan tombol ×. Pesan "berhasil" hilang sendiri setelah 8 detik;
 *    pesan gagal/perhatian tetap sampai ditutup.
 * `pesan` = { jenis, judul, isi } (isi berupa teks). `bersihkan` = nama parameter
 * alamat yang hanya dipakai untuk pesan ini (jangan masukkan parameter saringan).
 */
export default function PesanSekali({ pesan, bersihkan = PARAM_STANDAR }) {
  const sp = useSearchParams();
  const adaKode = bersihkan.some((k) => sp.has(k));
  const [buka, setBuka] = useState(true);

  useEffect(() => {
    if (!adaKode) return undefined;
    setBuka(true);
    try {
      const u = new URL(window.location.href);
      bersihkan.forEach((k) => u.searchParams.delete(k));
      window.history.replaceState(window.history.state, "", `${u.pathname}${u.search}${u.hash}`);
    } catch {
      /* abaikan: pesan tetap tampil */
    }
    if (pesan?.jenis !== "sukses") return undefined;
    const t = setTimeout(() => setBuka(false), 8000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adaKode]);

  if (!pesan || !buka) return null;
  return (
    <Pesan jenis={pesan.jenis} judul={pesan.judul} onTutup={() => setBuka(false)}>
      {pesan.isi}
    </Pesan>
  );
}
