"use client";

import { useEffect, useState } from "react";
import { cariAlmarhum } from "./actions";
import { formatTanggalId } from "@/lib/suratTemplate";

const input =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-navy focus:outline-none";

/**
 * Panel khusus Surat Keterangan Kematian: menghubungkan surat dengan data
 * penduduk. Saat surat disimpan, penduduk yang dipilih otomatis ditandai
 * meninggal dan tidak lagi dihitung dalam jumlah penduduk (riwayatnya tetap
 * tersimpan di Mutasi Penduduk).
 */
export default function PanelAlmarhum({
  terpilih,
  onPilih,
  onLepas,
  tandai,
  onTandai,
  tanggal,
  onTanggal,
  mutasiInfo,
  disabled,
}) {
  const [kata, setKata] = useState("");
  const [hasil, setHasil] = useState([]);
  const [mencari, setMencari] = useState(false);
  const [galat, setGalat] = useState("");

  // Pencarian dengan jeda singkat supaya tidak memanggil server tiap ketikan.
  useEffect(() => {
    const q = kata.trim();
    if (q.length < 3) {
      setHasil([]);
      setGalat("");
      return;
    }
    let batal = false;
    setMencari(true);
    const t = setTimeout(async () => {
      const r = await cariAlmarhum(q);
      if (batal) return;
      setMencari(false);
      setGalat(r?.error || "");
      setHasil(r?.hasil || []);
    }, 350);
    return () => {
      batal = true;
      clearTimeout(t);
    };
  }, [kata]);

  // Surat ini sudah pernah menandai seseorang meninggal.
  if (mutasiInfo) {
    return (
      <div className="space-y-1 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        <p className="font-semibold">Terhubung ke data penduduk</p>
        <p>
          {mutasiInfo.nama || "Penduduk"} sudah ditandai meninggal
          {mutasiInfo.tanggal ? ` pada ${formatTanggalId(mutasiInfo.tanggal)}` : ""} dan tidak
          dihitung lagi dalam jumlah penduduk.
        </p>
        <p className="text-xs text-emerald-700">
          Salah memilih orang? Administrator dapat membatalkannya di Data Kependudukan &rarr;
          Mutasi Penduduk.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div>
        <p className="text-sm font-semibold text-slate-700">Hubungkan ke data penduduk</p>
        <p className="mt-0.5 text-xs text-slate-500">
          Pilih penduduk yang meninggal agar datanya terisi otomatis dan jumlah penduduk
          menyesuaikan saat surat disimpan.
        </p>
      </div>

      {terpilih ? (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 p-3">
            <div className="min-w-0 text-sm">
              <p className="truncate font-medium text-slate-800">{terpilih.nama_lengkap}</p>
              <p className="font-mono text-[11px] text-slate-500">{terpilih.nik}</p>
              {terpilih.status_dalam_kk === "Kepala Keluarga" && (
                <p className="mt-1 text-[11px] text-amber-700">
                  Kepala Keluarga &mdash; kepala keluarga baru perlu ditentukan setelahnya.
                </p>
              )}
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={onLepas}
                className="shrink-0 text-xs font-medium text-slate-400 hover:text-slate-600"
              >
                Ganti
              </button>
            )}
          </div>

          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={tandai}
              disabled={disabled}
              onChange={(e) => onTandai(e.target.checked)}
            />
            <span>
              Tandai sebagai <b>meninggal</b> dan keluarkan dari jumlah penduduk saat surat
              disimpan
            </span>
          </label>

          {tandai && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Tanggal meninggal *
              </label>
              <input
                type="date"
                className={`${input} ${!tanggal ? "border-amber-400 bg-amber-50" : ""}`}
                value={tanggal}
                max={new Date().toISOString().slice(0, 10)}
                disabled={disabled}
                onChange={(e) => onTanggal(e.target.value)}
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Samakan dengan tanggal meninggal yang tertulis di isi surat.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <input
            className={input}
            placeholder="Cari nama atau NIK (min. 3 huruf)..."
            value={kata}
            disabled={disabled}
            onChange={(e) => setKata(e.target.value)}
          />
          {mencari && <p className="text-xs text-slate-400">Mencari...</p>}
          {galat && <p className="text-xs text-red-600">{galat}</p>}
          {!mencari && !galat && kata.trim().length >= 3 && hasil.length === 0 && (
            <p className="text-xs text-slate-400">
              Tidak ada penduduk aktif yang cocok. Jika orang itu belum terdata, surat tetap bisa
              dibuat dari isian form tanpa mengubah jumlah penduduk.
            </p>
          )}
          {hasil.length > 0 && (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {hasil.map((w) => (
                <li key={w.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      onPilih(w);
                      setKata("");
                      setHasil([]);
                    }}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <span className="font-medium text-slate-800">{w.nama_lengkap}</span>
                    <span className="block text-[11px] text-slate-500">
                      {w.nik} &middot; lahir {formatTanggalId(w.tanggal_lahir)}
                      {w.dusun ? ` · Dusun ${w.dusun}` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
