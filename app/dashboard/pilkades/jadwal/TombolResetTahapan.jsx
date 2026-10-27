"use client";

import { useState, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { resetTahapan } from "../actions";
import { Pesan, Kartu, tombol, kolomKecil } from "@/components/pilkades/UI";
import { formatRentang } from "@/lib/pilkadesJadwal";

function Kirim({ mode, children, disabled, className, onClick }) {
  const { pending } = useFormStatus();
  return (
    <button name="mode" value={mode} disabled={pending || disabled} className={className} onClick={onClick}>
      {pending ? "Memproses..." : children}
    </button>
  );
}

/**
 * Reset tahapan: centang tahapan yang ingin dikosongkan tanggal & catatannya,
 * atau reset SEMUA tahapan ke daftar standar (perlu mengetik RESET).
 * `tahap` = daftar tahapan yang ditampilkan di Jadwal Tahapan (urutan sama dengan database).
 */
export default function TombolResetTahapan({ periodeId, tahap, tersimpan }) {
  const [state, formAction] = useActionState(resetTahapan, {});
  const [buka, setBuka] = useState(false);
  const [dipilih, setDipilih] = useState(() => new Set());
  const [bukaSemua, setBukaSemua] = useState(false);
  const [teks, setTeks] = useState("");

  const bisaDipilih = tahap.map((t, i) => ({ t, i })).filter(({ t }) => t.jenis !== "pemungutan");
  const semuaTerpilih = bisaDipilih.length > 0 && bisaDipilih.every(({ i }) => dipilih.has(i));
  const ganti = (i) =>
    setDipilih((s) => {
      const n = new Set(s);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });
  const pilihSemua = () => setDipilih(semuaTerpilih ? new Set() : new Set(bisaDipilih.map(({ i }) => i)));
  const tutup = () => { setBuka(false); setDipilih(new Set()); setBukaSemua(false); setTeks(""); };

  const konfirmasiPilihan = (e) => {
    if (!window.confirm(`Reset ${dipilih.size} tahapan terpilih? Tanggal dan catatannya akan dikosongkan dan langsung tersimpan.`)) e.preventDefault();
  };

  return (
    <Kartu>
      <h2 className="text-base font-bold text-sky-950">Reset tahapan</h2>
      <p className="mt-1 text-sm text-slate-700">
        Centang tahapan yang ingin direset (tanggal dan catatannya dikosongkan), atau reset semua tahapan ke daftar standar.
        Data pemilih, TPS, DPS/DPT, calon, dan hasil suara <b>tidak</b> ikut terhapus.
      </p>

      {!buka ? (
        <button type="button" onClick={() => setBuka(true)} className={`${tombol.sekunder} mt-3 !border-red-300 !text-red-700`}>
          Reset tahapan...
        </button>
      ) : (
        <form action={formAction} className="mt-3 space-y-4 rounded-xl border border-red-200 bg-red-50 p-4">
          <input type="hidden" name="periode_id" value={periodeId} />
          <input type="hidden" name="jumlah" value={tahap.length} />

          {!tersimpan && (
            <p className="rounded-lg bg-white px-3 py-2 text-sm text-slate-800">
              Jadwal belum pernah disimpan, jadi belum ada tanggal yang perlu direset. Simpan jadwal dulu bila ingin mereset tahapan tertentu.
            </p>
          )}

          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-red-950">
              <input type="checkbox" checked={semuaTerpilih} onChange={pilihSemua} disabled={!tersimpan} className="h-5 w-5" />
              Pilih semua tahapan
            </label>
            <ul className="mt-2 space-y-1.5">
              {tahap.map((t, i) => {
                const pemungutan = t.jenis === "pemungutan";
                const tgl = !pemungutan && t.mulai ? formatRentang(t.mulai, t.selesai || undefined) : null;
                return (
                  <li key={i}>
                    <label className={`flex items-start gap-2 rounded-lg bg-white px-3 py-2 text-sm ${pemungutan || !tersimpan ? "opacity-60" : ""}`}>
                      <input
                        type="checkbox"
                        name="pilih"
                        value={i}
                        checked={dipilih.has(i)}
                        onChange={() => ganti(i)}
                        disabled={pemungutan || !tersimpan}
                        className="mt-0.5 h-5 w-5 shrink-0"
                      />
                      <span className="min-w-0">
                        <span className="font-semibold text-slate-900">{i + 1}. {t.nama}</span>
                        <span className="block text-slate-600">
                          {pemungutan ? "Tanggal mengikuti menu Periode Pilkades (tidak bisa direset di sini)" : tgl ?? "Belum bertanggal"}
                          {!pemungutan && t.catatan ? ` · ${t.catatan}` : ""}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>

          {state?.error && <Pesan jenis="bahaya" judul="Tahapan belum direset">{state.error}</Pesan>}

          <div className="flex flex-wrap items-center gap-3">
            <Kirim mode="pilihan" onClick={konfirmasiPilihan} disabled={dipilih.size === 0} className={`${tombol.bahaya} disabled:cursor-not-allowed disabled:opacity-40`}>
              Reset {dipilih.size > 0 ? `${dipilih.size} tahapan terpilih` : "tahapan terpilih"}
            </Kirim>
            <button type="button" onClick={() => setBukaSemua((v) => !v)} className={tombol.sekunder}>
              Reset semua tahapan...
            </button>
            <button type="button" onClick={tutup} className="text-sm font-semibold text-slate-700 underline">Batal</button>
          </div>

          {bukaSemua && (
            <div className="space-y-3 rounded-lg border border-red-300 bg-white p-3">
              <p className="text-sm text-red-950">
                <b>Reset semua</b> mengembalikan seluruh tahapan ke 10 tahapan standar dan mengosongkan semua tanggal.
                Nama, urutan, dan catatan yang sudah Anda ubah akan hilang.
              </p>
              <label className="block text-sm font-semibold text-red-950">
                Ketik <span className="font-mono">RESET</span> untuk melanjutkan
                <input name="konfirmasi" value={teks} onChange={(e) => setTeks(e.target.value)} autoComplete="off" className={`${kolomKecil} mt-1 block w-full max-w-xs font-mono`} />
              </label>
              <Kirim mode="semua" disabled={teks !== "RESET"} className={`${tombol.bahaya} disabled:cursor-not-allowed disabled:opacity-40`}>
                Ya, reset semua tahapan
              </Kirim>
            </div>
          )}
        </form>
      )}
    </Kartu>
  );
}
