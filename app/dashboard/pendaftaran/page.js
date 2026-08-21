import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS } from "@/lib/roles";
import BarisPendaftaran from "./BarisPendaftaran";
import SetujuiSemua from "./SetujuiSemua";

export default async function PendaftaranAkunPage() {
  const supabase = await createClient();
  const { data: daftar } = await supabase
    .from("pendaftaran_akun")
    .select("*, posisi_perangkat(role, wilayah, status)")
    .order("tanggal_daftar", { ascending: false });

  const pending = (daftar || []).filter((d) => d.status === "pending");
  const selesai = (daftar || []).filter((d) => d.status !== "pending");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-bold text-slate-800">Pendaftaran Kadus / Ketua RT</h1>
        <p className="text-sm text-slate-500">
          Antrian pendaftaran mandiri yang menunggu persetujuan. Slot yang
          sudah terisi otomatis ditolak sistem sebelum masuk sini.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-600">
          Menunggu Persetujuan ({pending.length})
        </h2>
        {pending.length === 0 && (
          <p className="text-sm text-slate-400">Tidak ada pendaftaran menunggu.</p>
        )}
        <SetujuiSemua jumlahPending={pending.length} />
        <div className="space-y-3">
          {pending.map((p) => (
            <BarisPendaftaran key={p.id} pendaftaran={p} />
          ))}
        </div>
      </section>

      {selesai.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-600">Riwayat</h2>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Nama</th>
                  <th className="px-4 py-3 font-medium">Posisi</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selesai.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 text-slate-700">{p.nama_lengkap}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {ROLE_LABELS[p.posisi_perangkat?.role]} — {p.posisi_perangkat?.wilayah}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          p.status === "disetujui"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {p.status === "disetujui" ? "Disetujui" : "Ditolak"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
