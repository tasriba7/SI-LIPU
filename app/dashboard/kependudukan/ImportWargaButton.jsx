"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { importWarga } from "./actions";
import { IconClose, IconUpload, IconDownload } from "@/components/icons";

// Data dikirim ke server bertahap, sebanyak ini per paket. Tidak ada batas
// jumlah baris per file — MAKS_BARIS hanya pengaman agar browser tidak macet
// kalau yang terunggah ternyata file yang salah (mis. ratusan ribu baris).
const UKURAN_BATCH = 100;
const MAKS_BARIS = 20000;

const fmt = (n) => Number(n || 0).toLocaleString("id-ID");

function formatSisaWaktu(ms) {
  const detik = Math.max(1, Math.round(ms / 1000));
  if (detik < 60) return `± ${detik} detik lagi`;
  const menit = Math.ceil(detik / 60);
  return `± ${menit} menit lagi`;
}

const tidur = (ms) => new Promise((r) => setTimeout(r, ms));

// Alias header -> nama kolom di database, supaya file yang headernya sedikit
// beda (mis. tanpa tanda "*", huruf besar/kecil, atau nama singkat) tetap
// terbaca. Kunci di sini sudah dinormalisasi lewat normalisasiHeader().
const ALIAS_HEADER = {
  nik: "nik",
  "no kk": "no_kk",
  "nomor kk": "no_kk",
  no_kk: "no_kk",
  "nama lengkap": "nama_lengkap",
  nama: "nama_lengkap",
  "tempat lahir": "tempat_lahir",
  "tanggal lahir": "tanggal_lahir",
  "tgl lahir": "tanggal_lahir",
  "jenis kelamin": "jenis_kelamin",
  jk: "jenis_kelamin",
  "status kawin": "status_kawin",
  "status perkawinan": "status_kawin",
  "status dalam kk": "status_dalam_kk",
  alamat: "alamat",
  dusun: "dusun",
  rt: "rt",
  rw: "rw",
  "no hp": "no_hp",
  "nomor hp": "no_hp",
  no_hp: "no_hp",
  pekerjaan: "pekerjaan",
  agama: "agama",
  pendidikan: "pendidikan",
  "pendidikan terakhir": "pendidikan",
};

function normalisasiHeader(h) {
  return String(h ?? "")
    .toLowerCase()
    .replace(/\*/g, "")
    .replace(/\./g, "")
    .replace(/_/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function barisKosong(baris) {
  return Object.values(baris).every((v) => v === null || v === undefined || String(v).trim() === "");
}

// Animasi khusus modal impor. Sengaja dibuat di sini (bukan di tailwind.config)
// supaya seluruh perubahan impor cukup satu file. Prefix "imp-" mencegah bentrok.
const GAYA_ANIMASI = `
@keyframes imp-pulse{0%{transform:scale(.78);opacity:.5}100%{transform:scale(1.4);opacity:0}}
@keyframes imp-shimmer{0%{transform:translateX(-120%)}100%{transform:translateX(320%)}}
@keyframes imp-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@keyframes imp-draw{to{stroke-dashoffset:0}}
@keyframes imp-pop{0%{transform:scale(.55);opacity:0}60%{transform:scale(1.08);opacity:1}100%{transform:scale(1);opacity:1}}
@keyframes imp-in{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:none}}
@keyframes imp-spin{to{transform:rotate(360deg)}}
.imp-pulse{animation:imp-pulse 2.4s ease-out infinite}
.imp-pulse-2{animation:imp-pulse 2.4s ease-out 1.2s infinite}
.imp-shimmer{animation:imp-shimmer 1.6s ease-in-out infinite}
.imp-float{animation:imp-float 2.6s ease-in-out infinite}
.imp-pop{animation:imp-pop .55s cubic-bezier(.34,1.56,.64,1) both}
.imp-in{animation:imp-in .45s ease-out both}
.imp-spin{animation:imp-spin 1.1s linear infinite}
.imp-draw{stroke-dasharray:100;stroke-dashoffset:100;animation:imp-draw .7s .2s ease-out forwards}
@media (prefers-reduced-motion:reduce){
  .imp-pulse,.imp-pulse-2,.imp-shimmer,.imp-float,.imp-spin{animation:none}
  .imp-pop,.imp-in{animation-duration:.01s}
  .imp-draw{animation-duration:.01s;animation-delay:0s}
}
`;

const R = 52;
const KELILING = 2 * Math.PI * R;

// ---------------------------------------------------------------------------
// Tampilan saat proses berjalan
// ---------------------------------------------------------------------------
function PanelProses({ prog, tampil, sisaMs, menghentikan, onHentikan }) {
  const persen = Math.min(Math.floor(tampil * 100), 99);

  return (
    <div className="imp-in px-2 pb-1 pt-4 text-center">
      <div className="relative mx-auto h-44 w-44">
        <span className="imp-pulse absolute inset-2 rounded-full border border-gold/40" />
        <span className="imp-pulse-2 absolute inset-2 rounded-full border border-seablue/40" />
        <svg viewBox="0 0 120 120" className="relative h-full w-full -rotate-90" aria-hidden>
          <defs>
            <linearGradient id="impGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#E8B933" />
              <stop offset="100%" stopColor="#3FA9F5" />
            </linearGradient>
          </defs>
          <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="9" />
          <circle
            cx="60"
            cy="60"
            r={R}
            fill="none"
            stroke="url(#impGrad)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={KELILING}
            strokeDashoffset={KELILING * (1 - tampil)}
            className="transition-[stroke-dashoffset] duration-200 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-4xl font-bold tabular-nums text-white">
            {persen}
            <span className="text-xl text-white/60">%</span>
          </span>
          <span className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-white/45">selesai</span>
        </div>
      </div>

      <h3 className="mt-5 flex items-center justify-center gap-2 font-display text-xl font-semibold text-white">
        <span className="imp-float inline-block">
          <IconUpload className="h-5 w-5 text-gold-light" />
        </span>
        Mengimpor data penduduk
      </h3>
      <p aria-live="polite" className="mt-1.5 text-sm text-white/60">
        Menyimpan paket {prog.batchKe} dari {prog.batchTotal} · {fmt(prog.selesai)} dari {fmt(prog.total)} baris
      </p>

      {/* Bar kemajuan dengan kilau bergerak */}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={persen}
        className="relative mx-auto mt-5 h-2.5 w-full overflow-hidden rounded-full bg-white/10"
      >
        <div
          className="relative h-full overflow-hidden rounded-full bg-gradient-to-r from-gold via-gold-light to-seablue transition-[width] duration-200 ease-linear"
          style={{ width: `${Math.max(tampil * 100, 2)}%` }}
        >
          <span className="imp-shimmer absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2.5">
        <div className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-3">
          <p className="font-display text-xl font-semibold tabular-nums text-white">{fmt(prog.selesai)}</p>
          <p className="mt-0.5 text-[11px] text-white/45">Diproses</p>
        </div>
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-3">
          <p className="font-display text-xl font-semibold tabular-nums text-emerald-300">{fmt(prog.berhasil)}</p>
          <p className="mt-0.5 text-[11px] text-emerald-200/60">Tersimpan</p>
        </div>
        <div className="rounded-xl border border-red-400/20 bg-red-400/[0.07] px-3 py-3">
          <p className="font-display text-xl font-semibold tabular-nums text-red-300">{fmt(prog.gagal)}</p>
          <p className="mt-0.5 text-[11px] text-red-200/60">Gagal</p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 text-xs text-white/45">
        <span className="flex items-center gap-2">
          <span className="imp-spin inline-block h-3.5 w-3.5 rounded-full border-2 border-white/20 border-t-gold" />
          {sisaMs != null ? formatSisaWaktu(sisaMs) : "Menghitung perkiraan waktu…"}
        </span>
        <button
          type="button"
          onClick={onHentikan}
          disabled={menghentikan}
          className="rounded-lg px-2.5 py-1 text-white/50 transition hover:bg-white/5 hover:text-white disabled:opacity-60"
        >
          {menghentikan ? "Menghentikan…" : "Hentikan"}
        </button>
      </div>
      <p className="mt-3 text-[11px] text-white/35">
        Jangan tutup atau muat ulang halaman sampai proses selesai.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tampilan hasil akhir
// ---------------------------------------------------------------------------
function PanelHasil({ hasil, onLagi, onSelesai }) {
  const { total, berhasil, gagal, daftarGagal, dihentikan, sisa } = hasil;
  const status = berhasil === 0 ? "gagal" : gagal > 0 || dihentikan ? "sebagian" : "sukses";

  const konfig = {
    sukses: { warna: "#34D399", judul: "Impor selesai", ket: `${fmt(berhasil)} data warga berhasil disimpan.` },
    sebagian: {
      warna: "#E8B933",
      judul: dihentikan ? "Impor dihentikan" : "Sebagian berhasil",
      ket: `${fmt(berhasil)} data tersimpan, ${fmt(gagal)} perlu diperbaiki${dihentikan ? `, ${fmt(sisa)} belum diproses` : ""}.`,
    },
    gagal: { warna: "#F87171", judul: "Impor gagal", ket: "Tidak ada data yang tersimpan. Periksa alasan di bawah lalu coba lagi." },
  }[status];

  function unduhDaftar() {
    const teks = `Daftar baris yang gagal diimpor (${daftarGagal.length})\n\n` + daftarGagal.join("\n");
    const url = URL.createObjectURL(new Blob([teks], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "impor-gagal.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="imp-in px-2 pb-1 pt-4 text-center">
      <div className="relative mx-auto h-28 w-28">
        <span className="imp-pulse absolute inset-3 rounded-full" style={{ border: `1px solid ${konfig.warna}66` }} />
        <svg viewBox="0 0 52 52" className="imp-pop relative h-full w-full" aria-hidden>
          <circle cx="26" cy="26" r="24" fill={`${konfig.warna}1F`} stroke={konfig.warna} strokeWidth="2" />
          {status === "sukses" && (
            <path d="M14.5 27l8 8 15-17" pathLength="100" fill="none" stroke={konfig.warna} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" className="imp-draw" />
          )}
          {status === "sebagian" && (
            <>
              <path d="M26 14.5v14" pathLength="100" fill="none" stroke={konfig.warna} strokeWidth="3.6" strokeLinecap="round" className="imp-draw" />
              <circle cx="26" cy="36.5" r="2.2" fill={konfig.warna} />
            </>
          )}
          {status === "gagal" && (
            <path d="M18 18l16 16M34 18L18 34" pathLength="100" fill="none" stroke={konfig.warna} strokeWidth="3.6" strokeLinecap="round" className="imp-draw" />
          )}
        </svg>
      </div>

      <h3 className="mt-4 font-display text-2xl font-semibold text-white">{konfig.judul}</h3>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-white/60">{konfig.ket}</p>

      <div className="mt-5 grid grid-cols-3 gap-2.5">
        <div className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-3">
          <p className="font-display text-xl font-semibold tabular-nums text-white">{fmt(total)}</p>
          <p className="mt-0.5 text-[11px] text-white/45">Total baris</p>
        </div>
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-3">
          <p className="font-display text-xl font-semibold tabular-nums text-emerald-300">{fmt(berhasil)}</p>
          <p className="mt-0.5 text-[11px] text-emerald-200/60">Berhasil</p>
        </div>
        <div className="rounded-xl border border-red-400/20 bg-red-400/[0.07] px-3 py-3">
          <p className="font-display text-xl font-semibold tabular-nums text-red-300">{fmt(gagal)}</p>
          <p className="mt-0.5 text-[11px] text-red-200/60">Gagal</p>
        </div>
      </div>

      {daftarGagal.length > 0 && (
        <div className="mt-5 text-left">
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-xs font-medium text-white/60">Baris yang perlu diperbaiki</p>
            <button
              type="button"
              onClick={unduhDaftar}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gold-light transition hover:bg-white/5"
            >
              <IconDownload className="h-3.5 w-3.5" />
              Unduh daftar
            </button>
          </div>
          <div className="max-h-44 overflow-y-auto rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
            <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-red-200/90">
              {daftarGagal.slice(0, 200).map((pesan, i) => (
                <li key={i}>{pesan}</li>
              ))}
            </ul>
            {daftarGagal.length > 200 && (
              <p className="mt-2 text-[11px] text-white/40">
                …dan {fmt(daftarGagal.length - 200)} lainnya. Unduh daftar untuk melihat semuanya.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center justify-end gap-3">
        <button type="button" onClick={onLagi} className="text-sm text-white/55 transition hover:text-white">
          Impor file lain
        </button>
        <button
          type="button"
          onClick={onSelesai}
          className="rounded-xl bg-gradient-to-r from-gold to-gold-light px-5 py-2 text-sm font-semibold text-navy-dark shadow-[0_6px_18px_-6px_rgba(232,185,51,0.8)] transition hover:brightness-105"
        >
          Selesai
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Komponen utama
// ---------------------------------------------------------------------------
export default function ImportWargaButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [rows, setRows] = useState(null); // hasil parsing file
  const [namaFile, setNamaFile] = useState("");
  const [errorParse, setErrorParse] = useState("");
  const fileInputRef = useRef(null);

  const [tahap, setTahap] = useState("pilih"); // "pilih" | "proses" | "selesai"
  const [prog, setProg] = useState({ total: 0, selesai: 0, berhasil: 0, gagal: 0, batchKe: 0, batchTotal: 0, batchSelesai: 0 });
  const [tampil, setTampil] = useState(0); // 0..1, halus, untuk animasi
  const [sisaMs, setSisaMs] = useState(null);
  const [hasil, setHasil] = useState(null);
  const [menghentikan, setMenghentikan] = useState(false);

  const batalRef = useRef(false);
  const batchMulaiRef = useRef(0);
  const batchUkuranRef = useRef(0);
  const msPerBarisRef = useRef(0);
  // Sumber tunggal untuk animasi persen. Dibaca lewat ref (bukan state) agar
  // interval animasi tidak pernah memadukan nilai lama dan baru saat ganti paket.
  const selesaiRef = useRef(0);
  const totalRef = useRef(0);

  useEffect(() => setMounted(true), []);

  const sedangProses = tahap === "proses";

  // Selama proses: modal tidak boleh tertutup tak sengaja (Esc / klik luar).
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e) {
      if (e.key === "Escape" && !sedangProses) tutup();
    }
    document.addEventListener("keydown", handleKeyDown);
    const scrollSebelumnya = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = scrollSebelumnya;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sedangProses]);

  // Peringatan bawaan browser kalau tab ditutup/dimuat ulang saat proses jalan.
  useEffect(() => {
    if (!sedangProses) return;
    const cegah = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", cegah);
    return () => window.removeEventListener("beforeunload", cegah);
  }, [sedangProses]);

  // Angka persen "merayap" pelan selama satu paket masih dikirim, supaya
  // animasi terasa hidup dan tidak diam lalu melompat tiap 100 baris.
  // Nilainya tidak pernah turun (Math.max) dan hanya membaca dari ref.
  useEffect(() => {
    if (!sedangProses) return;
    const id = setInterval(() => {
      const total = totalRef.current;
      if (!total) return;
      const ukuran = batchUkuranRef.current;
      const lewat = performance.now() - batchMulaiRef.current;
      const perkiraan = Math.max(msPerBarisRef.current * ukuran, 900);
      const merayap = Math.min(0.9, lewat / perkiraan) * ukuran;
      const nilai = Math.min((selesaiRef.current + merayap) / total, 0.99);
      setTampil((sebelumnya) => Math.max(sebelumnya, nilai));
    }, 120);
    return () => clearInterval(id);
  }, [sedangProses]);

  function tutup() {
    if (sedangProses) return;
    setOpen(false);
    setRows(null);
    setNamaFile("");
    setErrorParse("");
    setTahap("pilih");
    setHasil(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function imporFileLain() {
    setRows(null);
    setNamaFile("");
    setErrorParse("");
    setHasil(null);
    setTahap("pilih");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setNamaFile(file.name);
    setErrorParse("");
    setRows(null);

    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array", cellDates: true });
      const namaSheet = wb.SheetNames.includes("Data Penduduk")
        ? "Data Penduduk"
        : wb.SheetNames[0];
      const sheet = wb.Sheets[namaSheet];
      const dataMentah = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
        raw: false,
        dateNF: "yyyy-mm-dd",
      });

      const dipetakan = dataMentah.map((baris) => {
        const hasil = {};
        for (const [header, nilai] of Object.entries(baris)) {
          const kunci = ALIAS_HEADER[normalisasiHeader(header)];
          if (kunci) hasil[kunci] = typeof nilai === "string" ? nilai.trim() : nilai;
        }
        return hasil;
      });

      const bersih = dipetakan.filter((b) => !barisKosong(b));

      if (bersih.length === 0) {
        setErrorParse(
          "Tidak ada baris data yang terbaca. Pastikan file memakai template dan diisi mulai baris 2."
        );
        return;
      }
      if (bersih.length > MAKS_BARIS) {
        setErrorParse(
          `File berisi ${fmt(bersih.length)} baris. Untuk keamanan, satu kali impor dibatasi ${fmt(MAKS_BARIS)} baris — bagi file jadi beberapa bagian.`
        );
        return;
      }
      setRows(bersih);
    } catch (err) {
      setErrorParse("Gagal membaca file. Pastikan formatnya .xlsx, .xls, atau .csv.");
    }
  }

  async function mulaiImpor() {
    if (!rows || rows.length === 0 || sedangProses) return;

    batalRef.current = false;
    setMenghentikan(false);
    setSisaMs(null);
    msPerBarisRef.current = 0;

    const total = rows.length;
    const daftarGagal = [];
    let jumlahGagal = 0;
    let berhasil = 0;

    // Duplikat NIK di dalam file disaring di sini (bukan di server) karena
    // file dipecah jadi banyak paket — server hanya melihat satu paket.
    const lihat = new Set();
    const antre = [];
    rows.forEach((r, i) => {
      const nomor = i + 2; // baris 1 = header di file Excel
      const nik = String(r.nik ?? "").trim();
      if (nik && lihat.has(nik)) {
        daftarGagal.push(`Baris ${nomor}: NIK "${nik}" duplikat di dalam file yang diunggah.`);
        jumlahGagal += 1;
        return;
      }
      if (nik) lihat.add(nik);
      antre.push({ ...r, _baris: nomor });
    });

    const paket = [];
    for (let i = 0; i < antre.length; i += UKURAN_BATCH) paket.push(antre.slice(i, i + UKURAN_BATCH));

    let selesai = jumlahGagal; // baris duplikat dianggap sudah "diproses"
    const mulaiSemua = performance.now();
    let dihentikan = false;

    totalRef.current = total;
    selesaiRef.current = selesai;
    batchUkuranRef.current = paket[0]?.length || 1;
    batchMulaiRef.current = performance.now();
    setTampil(0);
    setProg({ total, selesai, berhasil, gagal: jumlahGagal, batchKe: 1, batchTotal: paket.length || 1, batchSelesai: 0 });
    setTahap("proses");

    for (let b = 0; b < paket.length; b++) {
      if (batalRef.current) {
        dihentikan = true;
        break;
      }
      const isi = paket[b];
      batchUkuranRef.current = isi.length;
      batchMulaiRef.current = performance.now();
      setProg((p) => ({ ...p, batchKe: b + 1 }));

      try {
        const fd = new FormData();
        fd.set("rows", JSON.stringify(isi));
        const res = await importWarga({}, fd);
        if (res?.error) {
          daftarGagal.push(`Baris ${isi[0]._baris}–${isi[isi.length - 1]._baris}: ${res.error}`);
          jumlahGagal += isi.length;
        } else {
          berhasil += res.ringkasan.berhasil;
          jumlahGagal += res.ringkasan.gagal;
          daftarGagal.push(...(res.daftarGagal || []));
        }
      } catch {
        daftarGagal.push(
          `Baris ${isi[0]._baris}–${isi[isi.length - 1]._baris}: gagal diproses (koneksi terputus atau server tidak merespons). Periksa data, lalu impor ulang bagian ini.`
        );
        jumlahGagal += isi.length;
      }

      selesai += isi.length;
      selesaiRef.current = selesai;
      const durasi = performance.now() - batchMulaiRef.current;
      const perBaris = durasi / isi.length;
      msPerBarisRef.current = msPerBarisRef.current ? msPerBarisRef.current * 0.6 + perBaris * 0.4 : perBaris;
      setSisaMs(msPerBarisRef.current * (total - selesai));
      setProg((p) => ({ ...p, selesai, berhasil, gagal: jumlahGagal, batchSelesai: b + 1 }));
    }

    // Beri waktu minimal agar animasi tidak berkedip pada file kecil.
    const lewat = performance.now() - mulaiSemua;
    if (lewat < 1400) await tidur(1400 - lewat);

    setTampil(1);
    await tidur(250);
    setHasil({
      total,
      berhasil,
      gagal: jumlahGagal,
      daftarGagal,
      dihentikan,
      sisa: Math.max(total - selesai, 0),
    });
    setTahap("selesai");
    if (berhasil > 0) router.refresh();
  }

  const tombolBuka = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-100"
    >
      <IconUpload className="h-4 w-4" />
      Impor Data Penduduk
    </button>
  );

  if (!mounted) return tombolBuka;

  const gelap = tahap !== "pilih";

  return (
    <>
      {tombolBuka}

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 overflow-y-auto bg-navy-dark/60 backdrop-blur-sm"
            onClick={tutup}
          >
            <style>{GAYA_ANIMASI}</style>
            <div className="flex min-h-screen items-center justify-center px-4 py-8">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="import-modal-title"
                className={`relative w-full max-w-lg overflow-hidden rounded-2xl shadow-xl transition-colors duration-500 ${
                  gelap
                    ? "bg-gradient-to-b from-navy-dark to-navy p-7 text-white ring-1 ring-white/10 shadow-2xl shadow-black/40"
                    : "bg-white p-6"
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                {gelap && (
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_0%,rgba(63,169,245,0.20),transparent),radial-gradient(50%_40%_at_90%_100%,rgba(232,185,51,0.12),transparent)]" />
                )}

                <div className="relative">
                  {tahap === "pilih" && (
                    <>
                      <button
                        type="button"
                        onClick={tutup}
                        aria-label="Tutup"
                        className="absolute right-0 top-0 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                      >
                        <IconClose className="h-5 w-5" />
                      </button>

                      <h2 id="import-modal-title" className="text-lg font-bold text-slate-800">
                        Impor Data Penduduk
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Unggah data warga sekaligus lewat file Excel, memakai format template
                        di bawah ini. Jumlah baris tidak dibatasi per file — data dikirim
                        bertahap dan kemajuannya ditampilkan.
                      </p>

                      <a
                        href="/template-import-penduduk.xlsx"
                        download
                        className="mt-4 flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-navy hover:bg-slate-50 w-fit"
                      >
                        <IconDownload className="h-4 w-4" />
                        Unduh Template Excel
                      </a>

                      <form
                        className="mt-5 space-y-3"
                        onSubmit={(e) => {
                          e.preventDefault();
                          mulaiImpor();
                        }}
                      >
                        <div>
                          <label className="mb-1 block text-sm text-slate-600">
                            Pilih file (.xlsx, .xls, atau .csv)
                          </label>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleFile}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-slate-200"
                          />
                        </div>

                        {errorParse && (
                          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                            {errorParse}
                          </p>
                        )}

                        {rows && rows.length > 0 && !errorParse && (
                          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                            {fmt(rows.length)} baris siap diimpor dari "{namaFile}".
                          </p>
                        )}

                        <div className="flex items-center justify-end gap-3 pt-1">
                          <button
                            type="button"
                            onClick={tutup}
                            className="text-sm text-slate-500 hover:text-slate-700"
                          >
                            Batal
                          </button>
                          <button
                            type="submit"
                            disabled={!rows || rows.length === 0}
                            className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light disabled:opacity-50"
                          >
                            Proses Impor
                          </button>
                        </div>
                      </form>
                    </>
                  )}

                  {tahap === "proses" && (
                    <>
                      <h2 id="import-modal-title" className="sr-only">Sedang mengimpor data penduduk</h2>
                      <PanelProses
                        prog={prog}
                        tampil={tampil}
                        sisaMs={prog.batchSelesai > 0 ? sisaMs : null}
                        menghentikan={menghentikan}
                        onHentikan={() => {
                          batalRef.current = true;
                          setMenghentikan(true);
                        }}
                      />
                    </>
                  )}

                  {tahap === "selesai" && hasil && (
                    <>
                      <h2 id="import-modal-title" className="sr-only">Hasil impor data penduduk</h2>
                      <PanelHasil hasil={hasil} onLagi={imporFileLain} onSelesai={tutup} />
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
