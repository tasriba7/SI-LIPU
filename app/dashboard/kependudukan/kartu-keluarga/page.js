import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { IconUsers } from "@/components/icons";

export default async function KartuKeluargaPage() {
  const supabase = await createClient();

  const { data: daftarKeluarga } = await supabase
    .from("keluarga")
    .select("id, no_kk, alamat, dusun, rt, rw")
    .order("no_kk")
    .limit(100);

  const { data: daftarWarga } = await supabase
    .from("warga")
    .select("no_kk, nama_lengkap, status_dalam_kk")
    .not("no_kk", "is", null);

  const anggotaPerKK = new Map();
  for (const w of daftarWarga ?? []) {
    if (!anggotaPerKK.has(w.no_kk)) anggotaPerKK.set(w.no_kk, []);
    anggotaPerKK.get(w.no_kk).push(w);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/kependudukan"
          className="text-sm text-slate-400 hover:text-slate-600"
        >
          &larr; Kembali ke daftar warga
        </Link>
        <h1 className="mt-2 text-lg font-bold text-slate-800">Kartu Keluarga</h1>
        <p className="text-sm text-slate-500">
          Rekap per No. KK — alamat di sini otomatis tersinkron dengan alamat
          seluruh anggotanya. Untuk mengubah alamat 1 keluarga, cukup edit
          alamat salah satu anggotanya di halaman Data Kependudukan.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">No. KK</th>
                <th className="px-4 py-3 font-medium">Alamat</th>
                <th className="px-4 py-3 font-medium">Dusun / RT-RW</th>
                <th className="px-4 py-3 font-medium">Kepala Keluarga</th>
                <th className="px-4 py-3 font-medium">Jumlah Anggota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(daftarKeluarga ?? []).map((k) => {
                const anggota = anggotaPerKK.get(k.no_kk) ?? [];
                const kepala = anggota.find(
                  (a) => a.status_dalam_kk === "Kepala Keluarga"
                );
                return (
                  <tr key={k.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono text-slate-600">{k.no_kk}</td>
                    <td className="px-4 py-3 text-slate-600">{k.alamat || "-"}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {k.dusun || "-"} {k.rt ? `· RT ${k.rt}` : ""} {k.rw ? `/RW ${k.rw}` : ""}
                    </td>
                    <td className="px-4 py-3">
                      {kepala ? (
                        kepala.nama_lengkap
                      ) : (
                        <span className="text-xs text-amber-600">Belum ada</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{anggota.length} orang</td>
                  </tr>
                );
              })}
              {(daftarKeluarga ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <div className="mx-auto flex max-w-xs flex-col items-center gap-2 text-slate-400">
                      <IconUsers className="h-8 w-8" />
                      <p className="text-sm">Belum ada Kartu Keluarga tercatat.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-400">Menampilkan maksimal 100 Kartu Keluarga.</p>
    </div>
  );
}
