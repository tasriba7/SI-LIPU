"use client";

import { useEffect, useState, useTransition } from "react";
import { bukaTautanData } from "./actions";
import PesanTautan from "./PesanTautan";
import TampilanData from "./TampilanData";
import WaktuLokal from "@/components/WaktuLokal";
import { labelSeksi } from "@/lib/tautanDataSeksi";

export default function GerbangTautan({
  token,
  instansi,
  keperluan,
  seksi,
  kedaluwarsaPada,
  desa,
}) {
  const [tahap, setTahap] = useState("peringatan"); // peringatan | data | tutup
  const [paham, setPaham] = useState(false);
  const [galat, setGalat] = useState("");
  const [hasil, setHasil] = useState(null);
  const [statusAkhir, setStatusAkhir] = useState("dibuka");
  const [isPending, startTransition] = useTransition();

  // Selama data tampil, tautan sudah hangus. Muat ulang/tutup = data hilang.
  useEffect(() => {
    if (tahap !== "data") return;
    const jaga = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", jaga);
    return () => window.removeEventListener("beforeunload", jaga);
  }, [tahap]);

  function bukaData() {
    setGalat("");
    startTransition(async () => {
      let h;
      try {
        h = await bukaTautanData(token);
      } catch {
        h = { status: "gagal" };
      }

      if (h.status === "ok") {
        setHasil(h);
        setTahap("data");
      } else if (h.status === "gagal") {
        // Gagal menyiapkan data: tautan BELUM hangus, boleh dicoba lagi.
        setGalat(
          "Mohon maaf, data belum berhasil disiapkan karena ada gangguan. Tautan Anda belum terpakai, silakan coba lagi sebentar lagi."
        );
      } else {
        setStatusAkhir(h.status);
        setTahap("tutup");
      }
    });
  }

  if (tahap === "tutup") return <PesanTautan status={statusAkhir} desa={desa} />;

  if (tahap === "data") {
    return <TampilanData hasil={hasil} />;
  }

  const namaDesa = [desa?.jenis, desa?.nama].filter(Boolean).join(" ");

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <h1 className="text-lg font-bold text-slate-800 sm:text-xl">
        Data dari {namaDesa || "Desa"} untuk {instansi}
      </h1>
      {keperluan && (
        <p className="mt-1 text-sm text-slate-500">Keperluan: {keperluan}</p>
      )}

      <div className="mt-5 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 sm:p-5">
        <p className="flex items-center gap-2 text-base font-bold text-amber-900">
          <span aria-hidden>⚠️</span> Penting: tautan ini hanya berlaku SEKALI
        </p>
        <ul className="mt-3 space-y-2 text-sm text-amber-900">
          <li>
            • Begitu Anda menekan tombol <b>&quot;Buka Data Sekarang&quot;</b> di bawah,
            tautan ini <b>langsung hangus</b> dan tidak bisa dibuka lagi, oleh
            Anda maupun orang lain.
          </li>
          <li>
            • Data dan tombol unduh hanya ada selama halaman ini tetap terbuka.
            Kalau halaman ditutup atau dimuat ulang, data tidak bisa dibuka lagi.
          </li>
          <li>
            • Jadi, buka hanya kalau Anda sudah siap: gunakan perangkat Anda
            sendiri, pastikan sinyal stabil, dan <b>segera unduh</b> data yang
            dibutuhkan.
          </li>
          <li>
            • Data ini bersifat rahasia dan hanya untuk keperluan instansi
            Anda. Jangan diteruskan atau disebarkan ke pihak lain.
          </li>
        </ul>
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
        <p className="font-semibold text-slate-700">Isi data yang dibagikan:</p>
        <ul className="mt-1 list-inside list-disc">
          {seksi.map((s) => (
            <li key={s}>{labelSeksi(s)}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-400">
          Halaman peringatan ini boleh dilihat tanpa menghanguskan tautan. Jika
          tidak jadi dibuka, tautan berlaku sampai{" "}
          <WaktuLokal iso={kedaluwarsaPada} />.
        </p>
      </div>

      {galat && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {galat}
        </p>
      )}

      <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={paham}
          onChange={(e) => setPaham(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[#0B2C6B]"
        />
        <span>
          Saya sudah membaca dan mengerti bahwa tautan ini hanya bisa dibuka
          satu kali, dan saya siap mengunduh datanya sekarang.
        </span>
      </label>

      <button
        type="button"
        onClick={bukaData}
        disabled={!paham || isPending}
        className="mt-4 w-full rounded-xl bg-navy px-5 py-3 text-sm font-semibold text-white transition hover:bg-navy-light disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
      >
        {isPending ? "Menyiapkan data... mohon tunggu" : "Buka Data Sekarang"}
      </button>
      {isPending && (
        <p className="mt-2 text-xs text-slate-400">
          Jangan tutup halaman ini. Data penduduk yang banyak butuh beberapa detik.
        </p>
      )}
    </div>
  );
}
