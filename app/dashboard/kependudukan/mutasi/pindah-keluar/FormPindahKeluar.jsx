"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { cariPendudukUntukMutasi, ambilAnggotaKeluarga, catatPindahKeluar } from "../actions";
import { formatTanggalId, hariIniISO } from "@/lib/suratTemplate";

const input =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-navy";
const kosong = "border-amber-400 bg-amber-50";

function Label({ children }) {
  return <label className="mb-1 block text-xs font-medium text-slate-500">{children}</label>;
}

export default function FormPindahKeluar() {
  const [kata, setKata] = useState("");
  const [hasil, setHasil] = useState([]);
  const [mencari, setMencari] = useState(false);
  const [galatCari, setGalatCari] = useState("");

  const [terpilih, setTerpilih] = useState(null);
  const [keluarga, setKeluarga] = useState([]);
  const [dipilih, setDipilih] = useState([]);

  const [tanggal, setTanggal] = useState("");
  const [tujuan, setTujuan] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [pesan, setPesan] = useState(null);
  const [pending, mulai] = useTransition();

  // Pencarian dengan jeda singkat supaya tidak memanggil server tiap ketikan.
  useEffect(() => {
    const q = kata.trim();
    if (q.length < 3) {
      setHasil([]);
      setGalatCari("");
      setMencari(false);
      return;
    }
    let batal = false;
    setMencari(true);
    const t = setTimeout(async () => {
      const r = await cariPendudukUntukMutasi(q, "aktif");
      if (batal) return;
      setMencari(false);
      setGalatCari(r?.error || "");
      setHasil(r?.hasil || []);
    }, 350);
    return () => {
      batal = true;
      clearTimeout(t);
    };
  }, [kata]);

  async function pilih(w) {
    setPesan(null);
    setTerpilih(w);
    setDipilih([w.id]);
    setKata("");
    setHasil([]);
    setKeluarga([w]);
    const r = await ambilAnggotaKeluarga(w.no_kk);
    const daftar = r?.anggota || [];
    // Pastikan orang yang dipilih selalu ada di daftar.
    setKeluarga(daftar.some((a) => a.id === w.id) ? daftar : [w, ...daftar]);
  }

  function lepas() {
    setTerpilih(null);
    setKeluarga([]);
    setDipilih([]);
  }

  function centang(id, nilai) {
    setDipilih((d) => (nilai ? [...new Set([...d, id])] : d.filter((x) => x !== id)));
  }

  function simpan() {
    setPesan(null);
    if (dipilih.length === 0) {
      setPesan({ jenis: "error", teks: "Pilih minimal 1 orang yang pindah." });
      return;
    }
    if (!tanggal) {
      setPesan({ jenis: "error", teks: "Isi tanggal pindah." });
      return;
    }
    if (!tujuan.trim()) {
      setPesan({ jenis: "error", teks: "Isi tujuan pindah (daerah/alamat)." });
      return;
    }
    const namaDipilih = keluarga.filter((a) => dipilih.includes(a.id)).map((a) => a.nama_lengkap);
    if (
      !window.confirm(
        `Catat ${dipilih.length} orang pindah keluar?\n\n${namaDipilih.join(", ")}\n\nMereka tidak akan dihitung lagi dalam jumlah penduduk.`
      )
    ) {
      return;
    }
    mulai(async () => {
      const r = await catatPindahKeluar({ wargaIds: dipilih, tanggal, tujuan, keterangan });
      if (r?.error) {
        setPesan({ jenis: "error", teks: r.error });
        return;
      }
      let teks = `${r.nama.join(", ") || `${r.jumlah} orang`} dicatat pindah keluar dan tidak dihitung lagi dalam jumlah penduduk.`;
      if (r.kepalaKeluarga && r.sisaAnggota > 0) {
        teks += ` Kepala Keluarga ikut pindah: tentukan Kepala Keluarga baru dari ${r.sisaAnggota} anggota yang tersisa (Data Kependudukan → Edit).`;
      }
      setPesan({ jenis: r.kepalaKeluarga && r.sisaAnggota > 0 ? "peringatan" : "ok", teks });
      lepas();
      setTanggal("");
      setTujuan("");
      setKeterangan("");
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-700">1. Pilih penduduk yang pindah</p>

        {terpilih ? (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 p-3">
              <div className="min-w-0 text-sm">
                <p className="truncate font-medium text-slate-800">{terpilih.nama_lengkap}</p>
                <p className="font-mono text-[11px] text-slate-500">{terpilih.nik}</p>
              </div>
              <button
                type="button"
                onClick={lepas}
                disabled={pending}
                className="shrink-0 text-xs font-medium text-slate-400 hover:text-slate-600"
              >
                Ganti
              </button>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs font-medium text-slate-500">
                  Siapa saja yang pindah? ({dipilih.length} dipilih)
                </p>
                {keluarga.length > 1 && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setDipilih(keluarga.map((a) => a.id))}
                    className="text-xs font-medium text-navy hover:underline"
                  >
                    Pilih seluruh keluarga
                  </button>
                )}
              </div>
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {keluarga.map((a) => (
                  <li key={a.id}>
                    <label className="flex cursor-pointer items-start gap-2 px-3 py-2 text-sm hover:bg-slate-50">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={dipilih.includes(a.id)}
                        disabled={pending}
                        onChange={(e) => centang(a.id, e.target.checked)}
                      />
                      <span>
                        <span className="font-medium text-slate-800">{a.nama_lengkap}</span>
                        <span className="block text-[11px] text-slate-500">
                          {a.status_dalam_kk || "-"} &middot; lahir {formatTanggalId(a.tanggal_lahir)}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              {!terpilih.no_kk && (
                <p className="mt-1 text-[11px] text-slate-400">
                  Penduduk ini belum punya No. KK, jadi anggota keluarganya tidak bisa ditampilkan.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <input
              className={input}
              placeholder="Cari nama atau NIK (min. 3 huruf)..."
              value={kata}
              onChange={(e) => setKata(e.target.value)}
            />
            {mencari && <p className="text-xs text-slate-400">Mencari...</p>}
            {galatCari && <p className="text-xs text-red-600">{galatCari}</p>}
            {!mencari && !galatCari && kata.trim().length >= 3 && hasil.length === 0 && (
              <p className="text-xs text-slate-400">Tidak ada penduduk aktif yang cocok.</p>
            )}
            {hasil.length > 0 && (
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {hasil.map((w) => (
                  <li key={w.id}>
                    <button
                      type="button"
                      onClick={() => pilih(w)}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                    >
                      <span className="font-medium text-slate-800">{w.nama_lengkap}</span>
                      <span className="block text-[11px] text-slate-500">
                        {w.nik} &middot; lahir {formatTanggalId(w.tanggal_lahir)}
                        {w.dusun ? ` · ${w.dusun}` : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {terpilih && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-700">2. Keterangan pindah</p>
          <div>
            <Label>Tanggal pindah *</Label>
            <input
              type="date"
              className={`${input} ${!tanggal ? kosong : ""}`}
              value={tanggal}
              max={hariIniISO()}
              disabled={pending}
              onChange={(e) => setTanggal(e.target.value)}
            />
          </div>
          <div>
            <Label>Tujuan pindah (daerah / alamat) *</Label>
            <input
              className={`${input} ${!tujuan.trim() ? kosong : ""}`}
              value={tujuan}
              maxLength={200}
              placeholder="mis. Kota Luwuk, Kab. Banggai"
              disabled={pending}
              onChange={(e) => setTujuan(e.target.value)}
            />
          </div>
          <div>
            <Label>Catatan (opsional)</Label>
            <input
              className={input}
              value={keterangan}
              maxLength={300}
              placeholder="mis. nomor surat pindah, alasan pindah"
              disabled={pending}
              onChange={(e) => setKeterangan(e.target.value)}
            />
          </div>
        </div>
      )}

      {pesan && (
        <p
          className={`rounded-lg p-3 text-sm ${
            pesan.jenis === "error"
              ? "bg-red-50 text-red-700"
              : pesan.jenis === "peringatan"
                ? "bg-amber-50 text-amber-800"
                : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {pesan.teks}
        </p>
      )}

      <div className="flex items-center gap-3">
        {terpilih && (
          <button
            type="button"
            onClick={simpan}
            disabled={pending}
            className="rounded-lg bg-navy px-5 py-2.5 text-sm font-medium text-white transition hover:bg-navy-light disabled:opacity-60"
          >
            {pending ? "Menyimpan..." : "Simpan Pindah Keluar"}
          </button>
        )}
        <Link href="/dashboard/kependudukan/mutasi" className="text-sm text-slate-500 hover:text-slate-700">
          {!pesan || pesan.jenis === "error" ? "Batal" : "Selesai, kembali ke Mutasi"}
        </Link>
      </div>
    </div>
  );
}
