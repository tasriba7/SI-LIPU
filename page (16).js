import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { IconPlus, IconMail, IconMessage, IconMegaphone, IconUsers } from "@/components/icons";
import ToggleAktif from "./ToggleAktif";

const ICON_MAP = {
  mail: IconMail,
  message: IconMessage,
  megaphone: IconMegaphone,
  users: IconUsers,
};

const KATEGORI_LABEL = {
  surat: "Surat",
  pengaduan: "Pengaduan",
  bansos: "Bantuan Sosial",
  lainnya: "Lainnya",
};

export default async function JenisLayananPage() {
  const supabase = await createClient();
  const { data: daftar } = await supabase
    .from("jenis_layanan_master")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Kelola Jenis Layanan</h1>
          <p className="text-sm text-slate-500">
            Tambah jenis layanan baru kapan saja — langsung muncul di menu
            &quot;Ajukan Layanan&quot; warga, tanpa perlu developer.
          </p>
        </div>
        <Link
          href="/dashboard/jenis-layanan/baru"
          className="flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light"
        >
          <IconPlus className="h-4 w-4" />
          Tambah Jenis Layanan
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3">Layanan</th>
              <th className="px-4 py-3">Kategori</th>
              <th className="px-4 py-3">Field Tambahan</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(daftar || []).map((jl) => {
              const Icon = ICON_MAP[jl.icon] || IconMail;
              return (
                <tr key={jl.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy/10 text-navy">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{jl.nama_layanan}</p>
                        <p className="text-xs text-slate-400">Kode: {jl.kode_prefix}-XXXXXX</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {KATEGORI_LABEL[jl.kategori] || jl.kategori}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {jl.form_schema?.length || 0} field
                  </td>
                  <td className="px-4 py-3">
                    <ToggleAktif id={jl.id} aktif={jl.aktif} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {(!daftar || daftar.length === 0) && (
          <p className="px-4 py-8 text-center text-sm text-slate-400">
            Belum ada jenis layanan.
          </p>
        )}
      </div>
    </div>
  );
}
