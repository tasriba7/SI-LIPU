"use client";

import { useState, useTransition } from "react";
import { aturPasswordMassal } from "./actions";
import BarisAkun from "./BarisAkun";

export default function PilihMassal({ daftar }) {
  const [terpilih, setTerpilih] = useState(new Set());
  const [isPending, startTransition] = useTransition();
  const [hasilMassal, setHasilMassal] = useState(null);
  const [error, setError] = useState(null);

  const byId = new Map(daftar.map((a) => [a.id, a]));

  function toggle(id) {
    setTerpilih((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSemua() {
    setTerpilih((prev) =>
      prev.size === daftar.length ? new Set() : new Set(daftar.map((a) => a.id))
    );
  }

  function handleAturMassal() {
    if (terpilih.size === 0) return;
    if (
      !confirm(
        `Buat password acak baru untuk ${terpilih.size} akun yang dipilih? Password lama akan langsung tidak berlaku.`
      )
    ) {
      return;
    }
    setError(null);
    setHasilMassal(null);
    const fd = new FormData();
    terpilih.forEach((id) => fd.append("user_id", id));
    startTransition(async () => {
      const res = await aturPasswordMassal(null, fd);
      if (res?.error) setError(res.error);
      else setHasilMassal(res.hasil);
    });
  }

  return (
    <div className="space-y-4">
      {terpilih.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-sm text-slate-600">{terpilih.size} akun dipilih</p>
          <button
            type="button"
            onClick={handleAturMassal}
            disabled={isPending}
            className="rounded-lg bg-navy px-3 py-1.5 text-xs font-medium text-white hover:bg-navy-light disabled:opacity-60"
          >
            {isPending ? "Memproses..." : "Acak Password Massal"}
          </button>
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {hasilMassal && (
        <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-800">
            Password baru dibuat untuk {hasilMassal.filter((h) => h.password).length} akun.
            Catat/sampaikan sekarang — tidak ditampilkan lagi setelah ini.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <tbody className="divide-y divide-emerald-100">
                {hasilMassal.map((h) => (
                  <tr key={h.userId}>
                    <td className="py-1 pr-4 text-emerald-800">
                      {byId.get(h.userId)?.nama || h.userId}
                    </td>
                    <td className="py-1 pr-4 font-mono text-emerald-700">
                      {h.password || `Gagal: ${h.error}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">
                <input
                  type="checkbox"
                  checked={daftar.length > 0 && terpilih.size === daftar.length}
                  onChange={toggleSemua}
                  className="h-4 w-4 rounded border-slate-300"
                />
              </th>
              <th className="px-4 py-3 font-medium">Nama / Email</th>
              <th className="px-4 py-3 font-medium">Jabatan</th>
              <th className="px-4 py-3 font-medium">Dusun/Wilayah</th>
              <th className="px-4 py-3 font-medium">Password</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {daftar.map((akun) => (
              <BarisAkun
                key={akun.id}
                akun={akun}
                checked={terpilih.has(akun.id)}
                onToggleCheck={() => toggle(akun.id)}
              />
            ))}
            {daftar.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  Belum ada akun staf.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
