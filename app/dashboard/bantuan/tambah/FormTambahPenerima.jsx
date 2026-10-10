"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { cariWargaUntukBantuan, tambahPenerimaBantuan } from "../actions";
import { KATEGORI_BANTUAN, labelWilayahWarga } from "@/lib/bantuan";

function TombolSimpan({ jumlah }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || jumlah === 0}
      className="rounded-lg bg-navy px-5 py-2.5 text-sm font-medium text-white hover:bg-navy-light disabled:opacity-50"
    >
      {pending ? "Menyimpan..." : `Simpan ${jumlah > 0 ? `${jumlah} Penerima` : "Penerima"}`}
    </button>
  );
}

export default function FormTambahPenerima({ daftarJenis, periodeAwal }) {
  const [state, formAction] = useActionState(tambahPenerimaBantuan, {});

  const [kata, setKata] = useState("");
  const [hasil, setHasil] = useState([]);
  const [pesanCari, setPesanCari] = useState("");
  const [sudahCari, setSudahCari] = useState(false);
  const [terpilih, setTerpilih] = useState([]); // [{ id, nama_lengkap, nik, dusun, rt, rw }]
  const [sedangCari, startCari] = useTransition();

  // Setelah berhasil disimpan, kosongkan pilihan supaya siap input berikutnya.
  useEffect(() => {
    if (state?.success) {
      setTerpilih([]);
      setHasil([]);
      setKata("");
      setSudahCari(false);
    }
  }, [state?.kunci, state?.success]);

  const idTerpilih = new Set(terpilih.map((w) => w.id));

  function cari() {
    setPesanCari("");
    startCari(async () => {
      const res = await cariWargaUntukBantuan(kata);
      setSudahCari(true);
      if (res?.error) {
        setHasil([]);
        setPesanCari(res.error);
        return;
      }
      setHasil(res.data ?? []);
    });
  }

  function pilih(w) {
    setTerpilih((lama) => (lama.some((x) => x.id === w.id) ? lama : [...lama, w]));
  }
  function lepas(id) {
    setTerpilih((lama) => lama.filter((w) => w.id !== id));
  }

  const kategoriAda = KATEGORI_BANTUAN.filter((k) => daftarJenis.some((j) => j.kategori === k.nilai));

  return (
    <form action={formAction} className="space-y-5">
      {/* 1. Bantuan */}
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-700">1. Jenis bantuan</h2>

        <div>
          <label htmlFor="jenis_bantuan_id" className="mb-1 block text-xs text-slate-500">
            Jenis bantuan
          </label>
          <select
            id="jenis_bantuan_id"
            name="jenis_bantuan_id"
            required
            defaultValue=""
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
          >
            <option value="" disabled>
              Pilih jenis bantuan...
            </option>
            {kategoriAda.map((k) => (
              <optgroup key={k.nilai} label={k.label}>
                {daftarJenis
                  .filter((j) => j.kategori === k.nilai)
                  .map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.nama}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-400">
            Bantuan yang dicari tidak ada?{" "}
            <Link href="/dashboard/bantuan/jenis" className="font-medium text-navy hover:underline">
              Tambah jenis bantuan baru
            </Link>
            .
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="periode" className="mb-1 block text-xs text-slate-500">
              Periode / tahap (opsional)
            </label>
            <input
              id="periode"
              name="periode"
              type="text"
              maxLength={60}
              defaultValue={periodeAwal}
              placeholder="Mis. 2026 atau Tahap 1 2026"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
            />
          </div>
          <div>
            <label htmlFor="keterangan" className="mb-1 block text-xs text-slate-500">
              Keterangan (opsional)
            </label>
            <input
              id="keterangan"
              name="keterangan"
              type="text"
              maxLength={500}
              placeholder="Mis. Rp300.000 per bulan"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
            />
          </div>
        </div>

        <label className="flex items-start gap-2.5 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          <input type="checkbox" name="tampil_publik" className="mt-0.5 h-4 w-4 accent-navy" />
          <span>
            <span className="font-medium text-slate-700">Langsung tampilkan ke warga</span>
            <span className="block text-xs text-slate-400">
              Kalau tidak dicentang, penerima tersimpan tetapi disembunyikan. Bisa diubah kapan saja
              dari daftar Bantuan Desa.
            </span>
          </span>
        </label>
      </section>

      {/* 2. Penerima */}
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-700">2. Penerima (dari Data Kependudukan)</h2>

        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={kata}
            onChange={(e) => setKata(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                cari();
              }
            }}
            placeholder="Ketik nama atau NIK warga, lalu klik Cari"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-navy"
          />
          <button
            type="button"
            onClick={cari}
            disabled={sedangCari}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {sedangCari ? "Mencari..." : "Cari"}
          </button>
        </div>

        {pesanCari && <p className="text-sm text-red-600">{pesanCari}</p>}

        {sudahCari && !pesanCari && hasil.length === 0 && (
          <p className="text-sm text-slate-400">
            Tidak ada warga aktif yang cocok. Pastikan datanya sudah ada di Data Kependudukan.
          </p>
        )}

        {hasil.length > 0 && (
          <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
            {hasil.map((w) => {
              const sudah = idTerpilih.has(w.id);
              return (
                <li key={w.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{w.nama_lengkap}</p>
                    <p className="truncate text-xs text-slate-400">
                      <span className="font-mono">{w.nik}</span> · {labelWilayahWarga(w)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => (sudah ? lepas(w.id) : pilih(w))}
                    className={`shrink-0 rounded-md px-3 py-1 text-xs font-medium ${
                      sudah
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-navy text-white hover:bg-navy-light"
                    }`}
                  >
                    {sudah ? "Dipilih ✓" : "Pilih"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div>
          <p className="mb-1.5 text-xs font-medium text-slate-500">
            Penerima terpilih ({terpilih.length})
          </p>
          {terpilih.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-slate-400">
              Belum ada yang dipilih. Cari nama di atas lalu klik &quot;Pilih&quot;.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {terpilih.map((w) => (
                <span
                  key={w.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-navy/10 py-1 pl-3 pr-1.5 text-xs text-navy"
                >
                  {w.nama_lengkap}
                  <button
                    type="button"
                    onClick={() => lepas(w.id)}
                    aria-label={`Hapus ${w.nama_lengkap} dari pilihan`}
                    className="flex h-4 w-4 items-center justify-center rounded-full bg-navy/20 text-[10px] leading-none hover:bg-navy/40"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <input type="hidden" name="warga_ids" value={JSON.stringify(terpilih.map((w) => w.id))} />
      </section>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}
      {state?.success && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {state.jumlahBaru} penerima berhasil ditambahkan
          {state.dilewati > 0 ? `, ${state.dilewati} dilewati karena sudah tercatat atau tidak aktif` : ""}
          .{" "}
          <Link href="/dashboard/bantuan" className="font-medium underline">
            Lihat daftar
          </Link>
        </p>
      )}

      <div className="flex items-center gap-3">
        <TombolSimpan jumlah={terpilih.length} />
        <Link href="/dashboard/bantuan" className="text-sm text-slate-400 hover:text-slate-600">
          Batal
        </Link>
      </div>
    </form>
  );
}
