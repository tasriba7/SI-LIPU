"use client";

import { useState, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { resetTahapan } from "../actions";
import { Pesan, Kartu, tombol, kolomKecil } from "@/components/pilkades/UI";

function TombolKirim() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className={tombol.bahaya}>
      {pending ? "Mereset..." : "Ya, reset tahapan"}
    </button>
  );
}

/**
 * Tombol "Reset tahapan": mengembalikan jadwal ke 10 tahapan standar (tanggal kosong)
 * dan langsung menyimpannya. Perlu mengetik RESET agar tidak terpencet tanpa sengaja.
 */
export default function TombolResetTahapan({ periodeId }) {
  const [state, formAction] = useActionState(resetTahapan, {});
  const [buka, setBuka] = useState(false);
  const [teks, setTeks] = useState("");

  return (
    <Kartu>
      <h2 className="text-base font-bold text-sky-950">Reset tahapan</h2>
      <p className="mt-1 text-sm text-slate-700">
        Mengembalikan semua tahapan ke daftar standar dan <b>mengosongkan seluruh tanggal</b>. Nama, urutan, dan catatan
        yang sudah Anda ubah akan hilang. Data pemilih, TPS, DPS/DPT, calon, dan hasil suara <b>tidak</b> ikut terhapus.
      </p>

      {!buka ? (
        <button type="button" onClick={() => setBuka(true)} className={`${tombol.sekunder} mt-3 !border-red-300 !text-red-700`}>
          Reset tahapan...
        </button>
      ) : (
        <form action={formAction} className="mt-3 space-y-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <input type="hidden" name="periode_id" value={periodeId} />
          <label className="block text-sm font-semibold text-red-950">
            Ketik <span className="font-mono">RESET</span> untuk melanjutkan
            <input
              name="konfirmasi"
              value={teks}
              onChange={(e) => setTeks(e.target.value)}
              autoComplete="off"
              className={`${kolomKecil} mt-1 block w-full max-w-xs font-mono`}
            />
          </label>
          {state?.error && <Pesan jenis="bahaya" judul="Tahapan belum direset">{state.error}</Pesan>}
          <div className="flex flex-wrap items-center gap-3">
            {teks === "RESET" ? <TombolKirim /> : (
              <button type="button" disabled className={`${tombol.bahaya} cursor-not-allowed opacity-40`}>Ya, reset tahapan</button>
            )}
            <button type="button" onClick={() => { setBuka(false); setTeks(""); }} className="text-sm font-semibold text-slate-700 underline">
              Batal
            </button>
          </div>
        </form>
      )}
    </Kartu>
  );
}
