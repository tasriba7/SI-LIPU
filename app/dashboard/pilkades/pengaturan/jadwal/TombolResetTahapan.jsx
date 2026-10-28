"use client";

import { useState, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { resetTahapan } from "../../actions";
import { Pesan, Kartu, tombol, kolomKecil } from "@/components/pilkades/UI";
import { formatRentang } from "@/lib/pilkadesJadwal";

function Kirim({ mode, children, disabled, className, onClick }) {
  const { pending, data } = useFormStatus();
  const sayaYangDiklik = pending && data?.get("mode") === mode;
  return (
    <button type="submit" name="mode" value={mode} disabled={pending || disabled} className={className} onClick={onClick}>
      {sayaYangDiklik ? "Memproses..." : children}
    </button>
  );
}

/**
 * Reset tahapan: centang tahapan yang ingin dikosongkan tanggal & catatannya,
 * atau reset SEMUA: membersihkan seluruh data periode (perlu mengetik RESET).
 * `tahap` = daftar tahapan yang ditampilkan di Jadwal Tahapan (urutan sama dengan database).
 * `ringkas` = jumlah data yang akan terhapus pada reset semua (untuk ditampilkan sebelum konfirmasi).
 */
export default function TombolResetTahapan({ periodeId, tahap, tersimpan, ringkas = {} }) {
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

  const daftarHapus = [
    [ringkas.pemilih, "calon pemilih / daftar pemilih"],
    [ringkas.tps, "TPS beserta penempatan pemilih"],
    [ringkas.arsip, "arsip DPS/DPT (semua versi)"],
    [ringkas.tambahan, "pemilih tambahan"],
    [ringkas.hadir, "catatan daftar hadir"],
    [ringkas.calon, "calon"],
    [ringkas.rekapTps, "rekap suara TPS"],
    [ringkas.hasil, "penetapan calon terpilih"],
    [ringkas.panitia, "pengurus susunan panitia"],
    [ringkas.logo, "logo panitia"],
    [ringkas.riwayat, "catatan Riwayat Aktivitas"],
  ].filter(([n]) => Number(n) > 0);

  const konfirmasiSemua = (e) => {
    if (!window.confirm("Hapus SEMUA data Pilkades pada periode ini? Tindakan ini tidak bisa dibatalkan.")) e.preventDefault();
  };

  const konfirmasiPilihan = (e) => {
    if (!window.confirm(`Reset ${dipilih.size} tahapan terpilih? Tanggal dan catatannya akan dikosongkan dan langsung tersimpan.`)) e.preventDefault();
  };

  return (
    <Kartu>
      <h2 className="text-base font-bold text-sky-950">Reset tahapan</h2>
      <p className="mt-1 text-sm text-slate-700">
        Centang tahapan yang ingin direset (hanya tanggal dan catatannya yang dikosongkan, data lain tidak berubah),
        atau <b>reset semua</b> untuk membersihkan seluruh data periode ini seperti belum pernah dipakai.
      </p>

      {!buka ? (
        <button type="button" onClick={() => setBuka(true)} className={`${tombol.sekunder} mt-3 w-full !border-red-300 !text-red-700 sm:w-auto`}>
          Reset tahapan...
        </button>
      ) : (
        <form action={formAction} onKeyDown={(e) => { if (e.key === "Enter" && e.target.tagName === "INPUT" && e.target.type !== "checkbox") e.preventDefault(); }} className="mt-3 space-y-4 rounded-xl border border-red-200 bg-red-50 p-3 sm:p-4">
          <input type="hidden" name="periode_id" value={periodeId} />
          <input type="hidden" name="jumlah" value={tahap.length} />

          {!tersimpan && (
            <p className="rounded-lg bg-white px-3 py-2 text-sm text-slate-800">
              Jadwal belum pernah disimpan, jadi belum ada tanggal yang perlu direset. Simpan jadwal dulu bila ingin mereset tahapan tertentu.
            </p>
          )}

          <div>
            <label className="flex items-center gap-3 py-1 text-sm font-bold text-red-950">
              <input type="checkbox" checked={semuaTerpilih} onChange={pilihSemua} disabled={!tersimpan} className="h-5 w-5" />
              Pilih semua tahapan
            </label>
            <ul className="mt-2 space-y-1.5">
              {tahap.map((t, i) => {
                const pemungutan = t.jenis === "pemungutan";
                const tgl = !pemungutan && t.mulai ? formatRentang(t.mulai, t.selesai || undefined) : null;
                return (
                  <li key={i}>
                    <label className={`flex items-start gap-3 rounded-lg bg-white px-3 py-3 text-sm ${pemungutan || !tersimpan ? "opacity-60" : ""}`}>
                      <input
                        type="checkbox"
                        name="pilih"
                        value={i}
                        checked={dipilih.has(i)}
                        onChange={() => ganti(i)}
                        disabled={pemungutan || !tersimpan}
                        className="mt-0.5 h-5 w-5 shrink-0"
                      />
                      <span className="min-w-0 break-words">
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

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Kirim mode="pilihan" onClick={konfirmasiPilihan} disabled={dipilih.size === 0} className={`${tombol.bahaya} w-full disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto`}>
              Reset {dipilih.size > 0 ? `${dipilih.size} tahapan terpilih` : "tahapan terpilih"}
            </Kirim>
            <button type="button" onClick={() => setBukaSemua((v) => !v)} className={`${tombol.sekunder} w-full sm:w-auto`}>
              Reset semua (hapus semua data)...
            </button>
            <button type="button" onClick={tutup} className="py-2 text-sm font-semibold text-slate-700 underline">Batal</button>
          </div>

          {bukaSemua && (
            <div className="space-y-3 rounded-lg border border-red-300 bg-white p-3">
              <p className="text-sm font-bold text-red-950">
                Reset semua menghapus seluruh data Pilkades pada periode ini dan tidak bisa dibatalkan.
              </p>
              {daftarHapus.length > 0 ? (
                <div className="text-sm text-red-950">
                  <p>Yang akan dihapus:</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5">
                    {daftarHapus.map(([n, label]) => (
                      <li key={label}>{label === "logo panitia" || label === "penetapan calon terpilih" ? label : `${n} ${label}`}</li>
                    ))}
                    <li>jadwal tahapan (kembali ke 10 tahapan standar, tanggal kosong)</li>
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-red-950">Yang akan dihapus: jadwal tahapan (kembali ke 10 tahapan standar, tanggal kosong).</p>
              )}
              <p className="text-sm text-slate-800">
                Yang tetap ada: periode ini (nama, tanggal pemungutan, status aktif) dan data penduduk/warga.
                Setelah reset, semua menu tahapan kembali terkunci seperti belum pernah dipakai.
              </p>
              <label className="block text-sm font-semibold text-red-950">
                Ketik <span className="font-mono">RESET</span> untuk melanjutkan
                <input name="konfirmasi" value={teks} onChange={(e) => setTeks(e.target.value)} autoComplete="off" autoCapitalize="characters" autoCorrect="off" spellCheck={false} className={`${kolomKecil} mt-1 block w-full max-w-xs font-mono`} />
              </label>
              <Kirim mode="semua" onClick={konfirmasiSemua} disabled={teks !== "RESET"} className={`${tombol.bahaya} w-full disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto`}>
                Ya, hapus semua data periode ini
              </Kirim>
            </div>
          )}
        </form>
      )}
    </Kartu>
  );
}
