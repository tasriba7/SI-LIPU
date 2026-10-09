"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { cariPendudukUntukMutasi, catatDatang } from "../actions";
import { PEKERJAAN_OPTIONS } from "@/lib/pekerjaanOptions";
import { PENDIDIKAN_OPTIONS } from "@/lib/pendidikanOptions";
import { formatTanggalId, hariIniISO } from "@/lib/suratTemplate";

const input =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-navy";
const kosong = "border-amber-400 bg-amber-50";

function Label({ children }) {
  return <label className="mb-1 block text-xs font-medium text-slate-500">{children}</label>;
}

function anggotaKosong() {
  return {
    key: crypto.randomUUID(),
    nik: "",
    nama_lengkap: "",
    tempat_lahir: "",
    tanggal_lahir: "",
    jenis_kelamin: "",
    status_kawin: "",
    status_dalam_kk: "",
    no_hp: "",
    pekerjaan: "",
    agama: "",
    pendidikan: "",
  };
}

export default function FormDatang({ pilihanDusun = [] }) {
  const [mode, setMode] = useState("baru"); // "baru" | "kembali"
  const [pending, mulai] = useTransition();
  const [pesan, setPesan] = useState(null);

  // Keterangan umum
  const [tanggal, setTanggal] = useState("");
  const [asal, setAsal] = useState("");
  const [keterangan, setKeterangan] = useState("");

  // Penduduk baru
  const [keluarga, setKeluarga] = useState({ no_kk: "", alamat: "", dusun: "", rt: "", rw: "" });
  const [anggota, setAnggota] = useState([anggotaKosong()]);

  // Datang kembali
  const [kata, setKata] = useState("");
  const [hasil, setHasil] = useState([]);
  const [mencari, setMencari] = useState(false);
  const [galatCari, setGalatCari] = useState("");
  const [kembali, setKembali] = useState([]); // daftar penduduk (objek) yang dipilih

  useEffect(() => {
    if (mode !== "kembali") return;
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
      const r = await cariPendudukUntukMutasi(q, "pindah");
      if (batal) return;
      setMencari(false);
      setGalatCari(r?.error || "");
      setHasil(r?.hasil || []);
    }, 350);
    return () => {
      batal = true;
      clearTimeout(t);
    };
  }, [kata, mode]);

  function ubahKel(k, v) {
    setKeluarga((s) => ({ ...s, [k]: v }));
  }
  function ubahAnggota(idx, k, v) {
    setAnggota((p) => p.map((a, i) => (i === idx ? { ...a, [k]: v } : a)));
  }

  function gantiMode(m) {
    setMode(m);
    setPesan(null);
  }

  function tambahKembali(w) {
    setKembali((d) => (d.some((x) => x.id === w.id) ? d : [...d, w]));
    setKata("");
    setHasil([]);
  }

  function simpan() {
    setPesan(null);
    if (!tanggal) return setPesan({ jenis: "error", teks: "Isi tanggal datang." });
    if (!asal.trim()) return setPesan({ jenis: "error", teks: "Isi daerah asal." });

    let daftar;
    let ringkas;
    if (mode === "baru") {
      daftar = anggota.map(({ key, ...sisa }) => sisa);
      ringkas = anggota.map((a) => a.nama_lengkap.trim() || "(tanpa nama)").join(", ");
    } else {
      if (kembali.length === 0) {
        return setPesan({ jenis: "error", teks: "Pilih minimal 1 penduduk yang datang kembali." });
      }
      daftar = kembali.map((w) => ({ wargaId: w.id }));
      ringkas = kembali.map((w) => w.nama_lengkap).join(", ");
    }

    if (
      !window.confirm(
        `Catat ${daftar.length} orang datang?\n\n${ringkas}\n\nMereka akan langsung dihitung dalam jumlah penduduk.`
      )
    ) {
      return;
    }

    mulai(async () => {
      const r = await catatDatang({
        tanggal,
        asal,
        keterangan,
        keluarga: mode === "baru" ? keluarga : {},
        anggota: daftar,
      });
      if (r?.error) {
        setPesan({ jenis: "error", teks: r.error });
        return;
      }
      setPesan({
        jenis: "ok",
        teks: `${r.nama.join(", ") || `${r.jumlah} orang`} dicatat datang dan sekarang dihitung dalam jumlah penduduk.`,
      });
      setAnggota([anggotaKosong()]);
      setKeluarga({ no_kk: "", alamat: "", dusun: "", rt: "", rw: "" });
      setKembali([]);
      setTanggal("");
      setAsal("");
      setKeterangan("");
    });
  }

  const tab = (m, teks) => (
    <button
      type="button"
      onClick={() => gantiMode(m)}
      disabled={pending}
      className={`rounded-lg border px-4 py-2 text-sm font-medium ${
        mode === m
          ? "border-navy bg-navy/5 text-navy"
          : "border-slate-300 text-slate-500 hover:bg-slate-50"
      }`}
    >
      {teks}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tab("baru", "Penduduk baru (belum ada di data)")}
        {tab("kembali", "Datang kembali (pernah pindah keluar)")}
      </div>

      {/* Keterangan umum */}
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-700">Keterangan kedatangan</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Tanggal datang *</Label>
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
            <Label>Daerah asal *</Label>
            <input
              className={`${input} ${!asal.trim() ? kosong : ""}`}
              value={asal}
              maxLength={200}
              placeholder="mis. Kota Luwuk, Kab. Banggai"
              disabled={pending}
              onChange={(e) => setAsal(e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label>Catatan (opsional)</Label>
          <input
            className={input}
            value={keterangan}
            maxLength={300}
            placeholder="mis. nomor surat pindah dari daerah asal"
            disabled={pending}
            onChange={(e) => setKeterangan(e.target.value)}
          />
        </div>
      </div>

      {mode === "baru" ? (
        <>
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-700">Data Kartu Keluarga di desa ini</p>
            <div>
              <Label>No. KK</Label>
              <input
                className={input}
                maxLength={16}
                inputMode="numeric"
                placeholder="16 digit, kosongkan jika belum ada"
                value={keluarga.no_kk}
                disabled={pending}
                onChange={(e) => ubahKel("no_kk", e.target.value)}
              />
            </div>
            <div>
              <Label>Alamat</Label>
              <textarea
                rows={2}
                className={input}
                value={keluarga.alamat}
                disabled={pending}
                onChange={(e) => ubahKel("alamat", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Dusun</Label>
                <select
                  className={input}
                  value={keluarga.dusun}
                  disabled={pending}
                  onChange={(e) => ubahKel("dusun", e.target.value)}
                >
                  <option value="">Pilih dusun</option>
                  {pilihanDusun.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                {pilihanDusun.length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">
                    Daftar dusun belum dibuat (menu Posisi).
                  </p>
                )}
              </div>
              <div>
                <Label>RT</Label>
                <input
                  className={input}
                  value={keluarga.rt}
                  disabled={pending}
                  onChange={(e) => ubahKel("rt", e.target.value)}
                />
              </div>
              <div>
                <Label>RW</Label>
                <input
                  className={input}
                  value={keluarga.rw}
                  disabled={pending}
                  onChange={(e) => ubahKel("rw", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-700">Anggota yang datang</h2>
            {anggota.map((a, idx) => (
              <div key={a.key} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700">Anggota {idx + 1}</p>
                  {anggota.length > 1 && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setAnggota((p) => p.filter((_, i) => i !== idx))}
                      className="text-xs font-medium text-red-500 hover:underline"
                    >
                      Hapus anggota ini
                    </button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>NIK (16 digit) *</Label>
                    <input
                      className={input}
                      maxLength={16}
                      inputMode="numeric"
                      value={a.nik}
                      disabled={pending}
                      onChange={(e) => ubahAnggota(idx, "nik", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Nama lengkap *</Label>
                    <input
                      className={input}
                      value={a.nama_lengkap}
                      disabled={pending}
                      onChange={(e) => ubahAnggota(idx, "nama_lengkap", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Tempat lahir</Label>
                    <input
                      className={input}
                      value={a.tempat_lahir}
                      disabled={pending}
                      onChange={(e) => ubahAnggota(idx, "tempat_lahir", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Tanggal lahir *</Label>
                    <input
                      type="date"
                      className={input}
                      value={a.tanggal_lahir}
                      disabled={pending}
                      onChange={(e) => ubahAnggota(idx, "tanggal_lahir", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Jenis kelamin</Label>
                    <select
                      className={input}
                      value={a.jenis_kelamin}
                      disabled={pending}
                      onChange={(e) => ubahAnggota(idx, "jenis_kelamin", e.target.value)}
                    >
                      <option value="">Pilih</option>
                      <option value="L">Laki-laki</option>
                      <option value="P">Perempuan</option>
                    </select>
                  </div>
                  <div>
                    <Label>Status kawin</Label>
                    <select
                      className={input}
                      value={a.status_kawin}
                      disabled={pending}
                      onChange={(e) => ubahAnggota(idx, "status_kawin", e.target.value)}
                    >
                      <option value="">Pilih</option>
                      <option value="Belum Kawin">Belum Kawin</option>
                      <option value="Kawin">Kawin</option>
                      <option value="Cerai Hidup">Cerai Hidup</option>
                      <option value="Cerai Mati">Cerai Mati</option>
                    </select>
                  </div>
                  <div>
                    <Label>Status dalam Kartu Keluarga</Label>
                    <select
                      className={input}
                      value={a.status_dalam_kk}
                      disabled={pending}
                      onChange={(e) => ubahAnggota(idx, "status_dalam_kk", e.target.value)}
                    >
                      <option value="">Pilih</option>
                      <option value="Kepala Keluarga">Kepala Keluarga</option>
                      <option value="Istri">Istri</option>
                      <option value="Anak">Anak</option>
                      <option value="Famili Lain">Famili Lain</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>
                  <div>
                    <Label>No. HP / WhatsApp (opsional)</Label>
                    <input
                      type="tel"
                      className={input}
                      value={a.no_hp}
                      disabled={pending}
                      onChange={(e) => ubahAnggota(idx, "no_hp", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Pekerjaan</Label>
                    <select
                      className={input}
                      value={a.pekerjaan}
                      disabled={pending}
                      onChange={(e) => ubahAnggota(idx, "pekerjaan", e.target.value)}
                    >
                      <option value="">Pilih</option>
                      {PEKERJAAN_OPTIONS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Agama</Label>
                    <select
                      className={input}
                      value={a.agama}
                      disabled={pending}
                      onChange={(e) => ubahAnggota(idx, "agama", e.target.value)}
                    >
                      <option value="">Pilih</option>
                      <option>Islam</option>
                      <option>Kristen Protestan</option>
                      <option>Katolik</option>
                      <option>Hindu</option>
                      <option>Buddha</option>
                      <option>Konghucu</option>
                      <option>Lainnya</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Pendidikan terakhir</Label>
                    <select
                      className={input}
                      value={a.pendidikan}
                      disabled={pending}
                      onChange={(e) => ubahAnggota(idx, "pendidikan", e.target.value)}
                    >
                      <option value="">Pilih</option>
                      {PENDIDIKAN_OPTIONS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              disabled={pending || anggota.length >= 20}
              onClick={() => setAnggota((p) => [...p, anggotaKosong()])}
              className="w-full rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-navy hover:bg-slate-50 disabled:opacity-50"
            >
              + Tambah anggota lain (opsional)
            </button>
          </div>
        </>
      ) : (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-700">Cari penduduk yang pernah pindah keluar</p>
          <input
            className={input}
            placeholder="Cari nama atau NIK (min. 3 huruf)..."
            value={kata}
            disabled={pending}
            onChange={(e) => setKata(e.target.value)}
          />
          {mencari && <p className="text-xs text-slate-400">Mencari...</p>}
          {galatCari && <p className="text-xs text-red-600">{galatCari}</p>}
          {!mencari && !galatCari && kata.trim().length >= 3 && hasil.length === 0 && (
            <p className="text-xs text-slate-400">
              Tidak ada penduduk berstatus pindah keluar yang cocok. Jika orang itu belum pernah
              tercatat di desa ini, gunakan tab &quot;Penduduk baru&quot;.
            </p>
          )}
          {hasil.length > 0 && (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {hasil.map((w) => (
                <li key={w.id}>
                  <button
                    type="button"
                    onClick={() => tambahKembali(w)}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <span className="font-medium text-slate-800">{w.nama_lengkap}</span>
                    <span className="block text-[11px] text-slate-500">
                      {w.nik} &middot; lahir {formatTanggalId(w.tanggal_lahir)}
                      {w.tanggal_status ? ` · pindah ${formatTanggalId(w.tanggal_status)}` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {kembali.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-slate-500">
                Akan dicatat datang kembali ({kembali.length})
              </p>
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50">
                {kembali.map((w) => (
                  <li key={w.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="min-w-0 truncate font-medium text-slate-800">{w.nama_lengkap}</span>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setKembali((d) => d.filter((x) => x.id !== w.id))}
                      className="shrink-0 text-xs font-medium text-red-500 hover:underline"
                    >
                      Hapus
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-slate-400">
                Data lama mereka dipakai kembali. Jika alamat atau status dalam keluarga berubah,
                perbarui lewat Data Kependudukan &rarr; Edit setelah disimpan.
              </p>
            </div>
          )}
        </div>
      )}

      {pesan && (
        <p
          className={`rounded-lg p-3 text-sm ${
            pesan.jenis === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {pesan.teks}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={simpan}
          disabled={pending}
          className="rounded-lg bg-navy px-5 py-2.5 text-sm font-medium text-white transition hover:bg-navy-light disabled:opacity-60"
        >
          {pending ? "Menyimpan..." : "Simpan Penduduk Datang"}
        </button>
        <Link href="/dashboard/kependudukan/mutasi" className="text-sm text-slate-500 hover:text-slate-700">
          {!pesan || pesan.jenis === "error" ? "Batal" : "Selesai, kembali ke Mutasi"}
        </Link>
      </div>
    </div>
  );
}
