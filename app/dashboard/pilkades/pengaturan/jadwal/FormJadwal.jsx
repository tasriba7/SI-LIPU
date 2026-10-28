"use client";

import { useState, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { simpanJadwal } from "../../actions";
import { Pesan, tombol, kolomKecil } from "@/components/pilkades/UI";
import { TAHAPAN_STANDAR, KET_OTOMATIS, MAKS_TAHAPAN, formatRentang } from "@/lib/pilkadesJadwal";

function TombolSimpan() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className={`${tombol.utama} text-base`}>
      {pending ? "Menyimpan..." : "Simpan jadwal"}
    </button>
  );
}

let penghitung = 0;
const baru = (r = {}) => ({
  key: `k${++penghitung}`,
  jenis: r.jenis ?? "",
  nama: r.nama ?? "",
  arti: r.arti ?? "",
  mulai: r.mulai ?? "",
  selesai: r.selesai ?? "",
  catatan: r.catatan ?? "",
});

const tombolMini =
  "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-35";

/**
 * Daftar tahapan yang bisa diatur: ganti nama, ubah urutan, tambah, hapus.
 * Tidak ada yang tersimpan sebelum tombol "Simpan jadwal" ditekan.
 * `awal` = tahapan tersimpan (atau daftar standar); `tanggalPemungutan` = dari menu Periode.
 */
export default function FormJadwal({ periodeId, awal, tanggalPemungutan, adminTautan }) {
  const [state, formAction] = useActionState(simpanJadwal, {});
  const [baris, setBaris] = useState(() => awal.map((r) => baru(r)));
  const [berubah, setBerubah] = useState(false);

  const ubahBaris = (fn) => {
    setBaris(fn);
    setBerubah(true);
  };
  const ubah = (key, kolomNama, v) => ubahBaris((b) => b.map((r) => (r.key === key ? { ...r, [kolomNama]: v } : r)));
  const pindah = (i, arah) =>
    ubahBaris((b) => {
      const j = i + arah;
      if (j < 0 || j >= b.length) return b;
      const salin = [...b];
      [salin[i], salin[j]] = [salin[j], salin[i]];
      return salin;
    });
  const hapus = (key) => ubahBaris((b) => b.filter((r) => r.key !== key));
  const tambah = () => ubahBaris((b) => [...b, baru()]);
  const standar = () => {
    if (window.confirm("Kembalikan ke daftar standar? Nama, urutan, dan tanggal di layar ini akan diganti (belum tersimpan sebelum Anda menekan Simpan jadwal).")) {
      ubahBaris(() => TAHAPAN_STANDAR.map((r) => baru(r)));
    }
  };

  const terisi = baris.filter((r) => r.mulai || r.jenis === "pemungutan").length;
  const payload = JSON.stringify(baris.map(({ key, ...r }) => r));

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="periode_id" value={periodeId} />
      <input type="hidden" name="data" value={payload} />

      <ol className="space-y-3">
        {baris.map((r, i) => {
          const pemungutan = r.jenis === "pemungutan";
          const salah = !pemungutan && r.mulai && r.selesai && r.selesai < r.mulai;
          return (
            <li key={r.key} className={`rounded-xl border bg-white p-4 ${salah ? "border-red-300" : "border-sky-100"}`}>
              <div className="flex items-start gap-3">
                <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-800">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <label className="block text-sm font-semibold text-slate-800">
                    Nama tahapan
                    <input
                      value={r.nama}
                      onChange={(e) => ubah(r.key, "nama", e.target.value)}
                      maxLength={80}
                      placeholder="Contoh: Sosialisasi kepada warga"
                      className={`${kolomKecil} mt-1 block w-full text-base font-semibold`}
                    />
                  </label>
                  {r.jenis && (
                    <p className="mt-1 text-sm font-medium text-emerald-800">⚙ {KET_OTOMATIS[r.jenis]}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button type="button" onClick={() => pindah(i, -1)} disabled={i === 0} aria-label="Naikkan urutan" title="Naikkan" className={tombolMini}>↑</button>
                  <button type="button" onClick={() => pindah(i, 1)} disabled={i === baris.length - 1} aria-label="Turunkan urutan" title="Turunkan" className={tombolMini}>↓</button>
                  {!pemungutan && (
                    <button type="button" onClick={() => hapus(r.key)} aria-label={`Hapus tahap ${r.nama || i + 1}`} title="Hapus tahap ini" className={`${tombolMini} text-red-700 hover:bg-red-50`}>🗑</button>
                  )}
                </div>
              </div>

              {pemungutan ? (
                <p className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-sm text-slate-800">
                  📅 <b>{tanggalPemungutan ? formatRentang(tanggalPemungutan) : "Tanggal belum diisi"}</b> — tanggal hari pemungutan diatur Administrator di menu <b>Periode Pilkades</b>
                  {adminTautan && <> (<a href="/dashboard/pilkades/pengaturan/periode" className="font-bold text-sky-800 underline">buka</a>)</>}.
                </p>
              ) : (
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.4fr]">
                  <label className="block text-sm font-semibold text-slate-800">
                    Mulai
                    <input type="date" value={r.mulai} onChange={(e) => ubah(r.key, "mulai", e.target.value)} className={`${kolomKecil} mt-1 block w-full font-normal`} />
                  </label>
                  <label className="block text-sm font-semibold text-slate-800">
                    Selesai <span className="font-normal text-slate-500">(kosong = 1 hari)</span>
                    <input type="date" value={r.selesai} min={r.mulai || undefined} onChange={(e) => ubah(r.key, "selesai", e.target.value)} className={`${kolomKecil} mt-1 block w-full font-normal`} />
                  </label>
                  <label className="block text-sm font-semibold text-slate-800 sm:col-span-2 lg:col-span-1">
                    Catatan <span className="font-normal text-slate-500">(boleh kosong)</span>
                    <input value={r.catatan} maxLength={200} onChange={(e) => ubah(r.key, "catatan", e.target.value)} placeholder="Misal: di Balai Desa, pukul 09.00" className={`${kolomKecil} mt-1 block w-full font-normal`} />
                  </label>
                </div>
              )}
              {salah && <p role="alert" className="mt-2 text-sm font-semibold text-red-700">Tanggal selesai lebih awal dari tanggal mulai.</p>}
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={tambah} disabled={baris.length >= MAKS_TAHAPAN} className={tombol.sekunder}>
          + Tambah tahapan
        </button>
        <button type="button" onClick={standar} className="text-sm font-semibold text-slate-600 underline hover:text-slate-900">
          Kembalikan ke daftar standar
        </button>
      </div>

      {state?.error && <Pesan jenis="bahaya" judul="Jadwal belum tersimpan">{state.error}</Pesan>}

      <div className="sticky bottom-3 flex flex-wrap items-center gap-3 rounded-xl border border-sky-100 bg-white/95 p-3 shadow-md backdrop-blur">
        <TombolSimpan />
        <p className={`text-sm ${berubah ? "font-semibold text-amber-800" : "text-slate-700"}`}>
          {berubah ? "Ada perubahan yang belum disimpan. " : ""}
          {baris.length} tahapan · {terisi} sudah bertanggal.
        </p>
      </div>
    </form>
  );
}
