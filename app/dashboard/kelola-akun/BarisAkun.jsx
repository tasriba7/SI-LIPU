"use client";

import { useState, useTransition } from "react";
import { aturPasswordAkun, hapusAkunWilayah } from "./actions";
import { ROLE_BADGE_CLASS, labelJabatan } from "@/lib/roles";
import { IconKey } from "@/components/icons";
import CopyButton from "@/components/CopyButton";

export default function BarisAkun({ akun, checked, onToggleCheck }) {
  const [buka, setBuka] = useState(false);
  const [mode, setMode] = useState("acak");
  const [passwordManual, setPasswordManual] = useState("");
  const [isPending, startTransition] = useTransition();
  const [hasil, setHasil] = useState(null);
  const [error, setError] = useState(null);

  const [hasilHapus, setHasilHapus] = useState(null);

  function handleHapus() {
    const catatanData =
      akun.jumlahWarga > 0
        ? `Akun ini pernah menginput ${akun.jumlahWarga} data penduduk. Data itu TIDAK dihapus dan tetap ada; hanya keterangan penginputnya yang tidak lagi tertaut ke akun.`
        : "Akun ini belum menginput data penduduk.";
    if (
      !confirm(
        `Hapus akun ${akun.nama} (${akun.email})?\n\n${catatanData}\n\nSlot posisinya akan dikosongkan sehingga bisa didaftar ulang, dan akun ini tidak bisa login lagi. Tindakan ini tidak bisa dibatalkan.`
      )
    ) {
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.set("user_id", akun.id);
    startTransition(async () => {
      const res = await hapusAkunWilayah(null, fd);
      if (res?.error) setError(res.error);
      else setHasilHapus(res);
    });
  }

  const badgeClass = ROLE_BADGE_CLASS[akun.role] ?? "bg-slate-100 text-slate-500";

  function handleSubmit() {
    if (
      mode === "acak" &&
      !confirm(`Buat password acak baru untuk ${akun.nama}? Password lama langsung tidak berlaku.`)
    ) {
      return;
    }
    setError(null);
    setHasil(null);
    const fd = new FormData();
    fd.set("user_id", akun.id);
    fd.set("mode", mode);
    fd.set("password_manual", passwordManual);
    startTransition(async () => {
      const res = await aturPasswordAkun(null, fd);
      if (res?.error) setError(res.error);
      else {
        setHasil(res.password);
        setPasswordManual("");
      }
    });
  }

  return (
    <tr className="align-top hover:bg-slate-50">
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggleCheck}
          className="h-4 w-4 rounded border-slate-300"
        />
      </td>
      <td className="px-4 py-3 text-slate-700">
        <p className="font-medium">{akun.nama}</p>
        <p className="text-xs text-slate-400">{akun.email}</p>
      </td>
      <td className="px-4 py-3">
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${badgeClass}`}>
          {labelJabatan(akun)}
        </span>
      </td>
      <td className="px-4 py-3 text-slate-500">{akun.dusun || "-"}</td>
      <td className="px-4 py-3">
        {!buka ? (
          <button
            type="button"
            onClick={() => setBuka(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <IconKey className="h-3.5 w-3.5" />
            Atur Password
          </button>
        ) : (
          <div className="w-64 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex gap-3 text-xs">
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name={`mode-${akun.id}`}
                  checked={mode === "acak"}
                  onChange={() => setMode("acak")}
                />
                Acak
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name={`mode-${akun.id}`}
                  checked={mode === "manual"}
                  onChange={() => setMode("manual")}
                />
                Manual
              </label>
            </div>
            {mode === "manual" && (
              <input
                type="text"
                value={passwordManual}
                onChange={(e) => setPasswordManual(e.target.value)}
                placeholder="Min. 6 karakter"
                className="w-full rounded-lg border border-slate-300 px-2 py-1 text-xs"
              />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending}
                className="rounded-lg bg-navy px-3 py-1.5 text-xs font-medium text-white hover:bg-navy-light disabled:opacity-60"
              >
                {isPending ? "Memproses..." : "Simpan"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setBuka(false);
                  setError(null);
                  setHasil(null);
                }}
                className="rounded-lg px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100"
              >
                Tutup
              </button>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            {hasil && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs">
                <p className="font-medium text-emerald-800">Password baru:</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <p className="break-all font-mono text-sm text-emerald-700">{hasil}</p>
                  <CopyButton text={hasil} />
                </div>
                <p className="mt-1 text-emerald-600">
                  Catat/sampaikan sekarang — tidak ditampilkan lagi setelah ini.
                </p>
              </div>
            )}
          </div>
        )}
        {akun.bisaDihapus && !hasilHapus && (
          <button
            type="button"
            onClick={handleHapus}
            disabled={isPending}
            className="mt-2 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            {isPending ? "Memproses..." : "Hapus Akun"}
          </button>
        )}
        {hasilHapus && (
          <p className="mt-2 w-64 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700">
            {hasilHapus.dinonaktifkan
              ? `Akun ${hasilHapus.nama} dinonaktifkan (tidak bisa login) karena masih dirujuk riwayat lain di database.`
              : `Akun ${hasilHapus.nama} dihapus.`}{" "}
            {hasilHapus.jumlahWarga > 0
              ? `${hasilHapus.jumlahWarga} data penduduk tetap tersimpan.`
              : ""}
          </p>
        )}
        {!buka && error && <p className="mt-2 w-64 text-xs text-red-600">{error}</p>}
      </td>
    </tr>
  );
}
