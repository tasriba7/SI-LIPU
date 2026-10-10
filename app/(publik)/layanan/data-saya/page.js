"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { cariDataSaya, kirimLaporanData, periksaTempatLahirDataSaya } from "./actions";
import VerifikasiTempatLahir from "@/components/VerifikasiTempatLahir";
import CopyButton from "@/components/CopyButton";
import { BAGIAN_DATA, PESAN_MAKS } from "@/lib/laporanData";

function Tombol({ teks, teksProses, className = "" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`w-full rounded-lg bg-navy py-2.5 font-medium text-white transition hover:bg-navy-light disabled:opacity-60 ${className}`}
    >
      {pending ? teksProses : teks}
    </button>
  );
}

function tanggalId(ymd) {
  if (!ymd) return "";
  const d = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function labelKelamin(v) {
  return v === "L" ? "Laki-laki" : v === "P" ? "Perempuan" : "";
}

function labelAlamat(d) {
  const bagian = [];
  if (d.alamat) bagian.push(d.alamat);
  if (d.dusun) bagian.push(`Dusun ${d.dusun}`);
  if (d.rt || d.rw) bagian.push(`RT ${d.rt || "-"} / RW ${d.rw || "-"}`);
  return bagian.join(", ");
}

// Daftar baris data yang ditampilkan. `bagian` = nilai pilihan di BAGIAN_DATA,
// dipakai tombol "Laporkan" supaya form laporan langsung terisi bagian yang benar.
function barisData(d) {
  return [
    { label: "Nama lengkap", nilai: d.nama_lengkap, bagian: "Nama lengkap" },
    { label: "NIK", nilai: d.nik, bagian: "NIK", mono: true },
    { label: "Nomor KK", nilai: d.no_kk, bagian: "Nomor KK", mono: true },
    { label: "Tempat lahir", nilai: d.tempat_lahir, bagian: "Tempat lahir" },
    { label: "Tanggal lahir", nilai: tanggalId(d.tanggal_lahir), bagian: "Tanggal lahir" },
    { label: "Jenis kelamin", nilai: labelKelamin(d.jenis_kelamin), bagian: "Jenis kelamin" },
    { label: "Alamat", nilai: labelAlamat(d), bagian: "Alamat / Dusun / RT / RW" },
    { label: "Status perkawinan", nilai: d.status_kawin, bagian: "Status perkawinan" },
    { label: "Pekerjaan", nilai: d.pekerjaan, bagian: "Pekerjaan" },
    { label: "Agama", nilai: d.agama, bagian: "Agama" },
    { label: "Pendidikan", nilai: d.pendidikan, bagian: "Pendidikan" },
    { label: "Nomor HP", nilai: d.no_hp, bagian: "Nomor HP" },
  ];
}

export default function DataSayaPage() {
  const [stAsli, formAction] = useActionState(cariDataSaya, {});
  // Hasil setelah tebak tempat lahir (terikat ke pencarian yang memulainya).
  const [lanjut, setLanjut] = useState(null); // { src, hasil }
  const [batal, setBatal] = useState(null); // { src, pesan }
  const state = useMemo(() => {
    if (lanjut && lanjut.src === stAsli) return lanjut.hasil;
    if (batal && batal.src === stAsli) return { error: batal.pesan };
    return stAsli;
  }, [stAsli, lanjut, batal]);
  const [stLapor, laporAction] = useActionState(kirimLaporanData, {});
  const [bagian, setBagian] = useState("");
  const [panjang, setPanjang] = useState(0);
  const formLaporRef = useRef(null);

  const d = state?.data;
  const baris = d ? barisData(d) : [];
  const jumlahKosong = baris.filter((b) => !b.nilai).length;

  function laporkan(namaBagian) {
    setBagian(namaBagian);
    formLaporRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-center text-xl font-bold text-navy">Data Saya</h1>
          <p className="mb-6 mt-1 text-center text-sm text-slate-500">
            Masukkan NIK dan tanggal lahir untuk melihat data kependudukan Anda. Kalau ada yang
            keliru atau kurang, Anda bisa langsung melaporkannya ke admin desa.
          </p>

          {!d && state?.verifikasi && (
            <VerifikasiTempatLahir
              opsi={state.verifikasi.opsi}
              sisaAwal={state.verifikasi.sisa}
              periksa={(pilihan) =>
                periksaTempatLahirDataSaya(state.nik, state.tanggal, state.verifikasi.tiket, pilihan)
              }
              onSukses={(r) => setLanjut({ src: stAsli, hasil: { data: r.data } })}
              onBatal={(pesan) => setBatal({ src: stAsli, pesan })}
            />
          )}

          {!d && !state?.verifikasi && (
            <form action={formAction} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-slate-600">NIK (16 digit)</label>
                <input
                  type="text"
                  name="nik"
                  required
                  maxLength={16}
                  inputMode="numeric"
                  pattern="\d{16}"
                  autoComplete="off"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-navy"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Tanggal Lahir</label>
                <input
                  type="date"
                  name="tanggal_lahir"
                  required
                  autoComplete="off"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-navy"
                />
              </div>

              {state?.error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
              )}
              {state?.kosong && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">{state.pesan}</p>
              )}

              <Tombol teks="Lihat Data Saya" teksProses="Mencari..." />
              <p className="text-center text-xs text-slate-400">
                Data hanya tampil untuk Anda sendiri dan tidak disimpan di perangkat ini.
              </p>
            </form>
          )}

          {d && (
            <div className="space-y-5">
              <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Data ditemukan. Periksa dengan teliti. Jika ada yang tidak sesuai, tekan{" "}
                <span className="font-semibold">Laporkan</span> di sebelah datanya.
              </div>

              {jumlahKosong > 0 && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Ada {jumlahKosong} data yang belum terisi (ditandai kuning). Jika Anda punya data
                  tersebut, mohon laporkan agar dilengkapi.
                </p>
              )}

              <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm">
                {baris.map((b) => (
                  <div key={b.label} className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <dt className="text-xs text-slate-400">{b.label}</dt>
                      <dd
                        className={
                          b.nilai
                            ? `break-words font-medium text-slate-800 ${b.mono ? "font-mono tracking-wide" : ""}`
                            : "rounded bg-amber-50 px-1.5 py-0.5 text-amber-700"
                        }
                      >
                        {b.nilai || "Belum diisi"}
                      </dd>
                    </div>
                    <button
                      type="button"
                      onClick={() => laporkan(b.bagian)}
                      className="shrink-0 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:border-navy hover:text-navy"
                    >
                      Laporkan
                    </button>
                  </div>
                ))}
              </dl>

              {/* Form laporan ke admin */}
              <div ref={formLaporRef} className="rounded-xl border border-slate-200 p-4">
                {stLapor?.sukses ? (
                  <div className="space-y-3 text-center">
                    <p className="text-sm font-semibold text-emerald-700">Laporan terkirim ke admin desa</p>
                    <p className="text-xs text-slate-500">
                      Simpan kode ini sebagai bukti. Perubahan data dilakukan admin setelah dicek.
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-mono text-sm tracking-wider text-slate-700">{stLapor.kode}</span>
                      <CopyButton text={stLapor.kode} label="Salin kode" />
                    </div>
                  </div>
                ) : (
                  <form action={laporAction} className="space-y-3">
                    <h2 className="text-sm font-semibold text-slate-700">Ada data yang keliru atau kurang?</h2>

                    {/* Identitas yang barusan cocok; diperiksa ULANG di server. */}
                    <input type="hidden" name="nik" value={d.nik} />
                    <input type="hidden" name="tanggal_lahir" value={d.tanggal_lahir} />

                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Bagian data yang keliru (boleh dikosongkan)</label>
                      <select
                        name="bagian"
                        value={bagian}
                        onChange={(e) => setBagian(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-navy"
                      >
                        <option value="">— Pilih —</option>
                        {BAGIAN_DATA.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Pesan untuk admin</label>
                      <textarea
                        name="pesan"
                        required
                        rows={4}
                        maxLength={PESAN_MAKS}
                        onChange={(e) => setPanjang(e.target.value.length)}
                        placeholder="Contoh: Pekerjaan saya tertulis Petani, seharusnya Nelayan."
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
                      />
                      <p className="mt-0.5 text-right text-[11px] text-slate-400">
                        {panjang}/{PESAN_MAKS}
                      </p>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs text-slate-500">
                        Nomor HP yang bisa dihubungi (boleh dikosongkan)
                      </label>
                      <input
                        type="tel"
                        name="no_hp"
                        inputMode="tel"
                        maxLength={20}
                        autoComplete="off"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
                      />
                    </div>

                    {stLapor?.error && (
                      <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{stLapor.error}</p>
                    )}

                    <Tombol teks="Kirim ke Admin" teksProses="Mengirim..." />
                  </form>
                )}
              </div>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="block w-full text-center text-xs text-slate-400 hover:text-slate-600"
              >
                Selesai, tutup data ini
              </button>
            </div>
          )}

          <Link href="/layanan/riwayat" className="mt-6 block text-center text-xs text-slate-400 hover:text-slate-600">
            Lihat riwayat pengajuan saya
          </Link>
          <Link href="/" className="mt-2 block text-center text-xs text-slate-400 hover:text-slate-600">
            Kembali ke beranda
          </Link>
        </div>
      </div>
    </main>
  );
}
