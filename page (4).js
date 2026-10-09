import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/roles";
import { hitungStatus } from "@/lib/tautanData";
import { labelSeksi } from "@/lib/tautanDataSeksi";
import WaktuLokal from "@/components/WaktuLokal";
import FormBagikan from "./FormBagikan";
import TombolBatalkan from "./TombolBatalkan";

export const dynamic = "force-dynamic";

const BADGE = {
  aktif: { teks: "Menunggu dibuka", kelas: "bg-sky-100 text-sky-700" },
  dibuka: { teks: "Sudah dibuka", kelas: "bg-emerald-100 text-emerald-700" },
  kedaluwarsa: { teks: "Hangus (tidak sempat dibuka)", kelas: "bg-slate-100 text-slate-500" },
  dibatalkan: { teks: "Dibatalkan", kelas: "bg-red-100 text-red-600" },
};

export default async function BagikanDataPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profileSaya } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id)
    .single();

  if (!isAdminRole(profileSaya?.role)) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-lg font-bold text-amber-800">Halaman Terbatas</h1>
        <p className="mt-2 text-sm text-amber-700">
          Halaman ini hanya bisa diakses oleh Administrator.
        </p>
      </div>
    );
  }

  const { data: riwayat } = await supabase
    .from("tautan_data")
    .select(
      "id, instansi, keperluan, seksi, status, dibuat_oleh_nama, dibuat_pada, kedaluwarsa_pada, dibuka_pada"
    )
    .order("dibuat_pada", { ascending: false })
    .limit(30);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/pengaturan-desa"
          className="text-sm text-slate-400 hover:text-slate-600"
        >
          &larr; Kembali ke Pengaturan Desa
        </Link>
        <h1 className="mt-2 text-lg font-bold text-slate-800">Bagikan Data ke Instansi</h1>
        <p className="text-sm text-slate-500">
          Buat tautan khusus untuk instansi/lembaga yang meminta data desa.
          Tautan <b>hanya bisa dipakai satu kali</b>: begitu penerima membuka
          datanya, tautan langsung hangus, supaya data tidak disalahgunakan.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <FormBagikan />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-700">Riwayat tautan</h2>
          <p className="text-xs text-slate-400">
            30 tautan terakhir. Tautan asli tidak disimpan, jadi tidak bisa
            ditampilkan lagi.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Instansi</th>
                <th className="px-4 py-3 font-medium">Isi data</th>
                <th className="px-4 py-3 font-medium">Dibuat</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(riwayat ?? []).map((t) => {
                const status = hitungStatus(t);
                const badge = BADGE[status];
                return (
                  <tr key={t.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-700">{t.instansi}</p>
                      {t.keperluan && (
                        <p className="text-xs text-slate-400">{t.keperluan}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {t.seksi.map(labelSeksi).join(", ")}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      <WaktuLokal iso={t.dibuat_pada} />
                      {t.dibuat_oleh_nama && (
                        <span className="block text-slate-400">oleh {t.dibuat_oleh_nama}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.kelas}`}>
                        {badge.teks}
                      </span>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {status === "dibuka" ? (
                          <>
                            Dibuka <WaktuLokal iso={t.dibuka_pada} />
                          </>
                        ) : status === "aktif" ? (
                          <>
                            Berlaku sampai <WaktuLokal iso={t.kedaluwarsa_pada} />
                          </>
                        ) : null}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {status === "aktif" && (
                        <TombolBatalkan id={t.id} instansi={t.instansi} />
                      )}
                    </td>
                  </tr>
                );
              })}
              {(riwayat ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-400">
                    Belum ada tautan yang dibuat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
