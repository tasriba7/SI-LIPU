import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS } from "@/lib/roles";
import FormTambahSlot from "./FormTambahSlot";
import TombolKosongkanSlot from "./TombolKosongkanSlot";

export default async function PosisiPerangkatPage() {
  const supabase = await createClient();
  const { data: daftar, error } = await supabase
    .from("posisi_perangkat")
    .select("id, role, wilayah, status, profiles!profile_id(nama)")
    .order("role")
    .order("wilayah");

  if (error) {
    console.error("Gagal memuat daftar posisi_perangkat:", error);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-slate-800">Slot Posisi (Kadus & Ketua RT)</h1>
        <p className="text-sm text-slate-500">
          Daftarkan dulu wilayah (dusun/RT-RW) sebagai slot kosong, baru
          calon Kadus/Ketua RT bisa mendaftar mandiri lewat{" "}
          <code className="rounded bg-slate-100 px-1">/pendaftaran</code>.
        </p>
      </div>

      <FormTambahSlot />

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          Gagal memuat daftar slot: {error.message}
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Wilayah</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Dipegang oleh</th>
              <th className="px-4 py-3 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(daftar ?? []).map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-700">{ROLE_LABELS[p.role]}</td>
                <td className="px-4 py-3 text-slate-700">{p.wilayah}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      p.status === "terisi"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {p.status === "terisi" ? "Terisi" : "Kosong"}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {p.profiles?.nama || "-"}
                </td>
                <td className="px-4 py-3">
                  {p.status === "terisi" && <TombolKosongkanSlot id={p.id} />}
                </td>
              </tr>
            ))}
            {(daftar ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  Belum ada slot posisi. Tambah dulu lewat form di atas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
