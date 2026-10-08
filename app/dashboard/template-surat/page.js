import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { pastikanAdmin } from "@/lib/akses";
import HalamanTerbatas from "@/components/dashboard/HalamanTerbatas";
import ToggleAktifTemplate from "./ToggleAktifTemplate";

export default async function TemplateSuratPage() {
  const supabase = await createClient();
  const cek = await pastikanAdmin(supabase);
  if (cek.error) return <HalamanTerbatas />;

  const { data: daftar } = await supabase
    .from("template_surat")
    .select("id, kode, nama, kata_kunci, aktif, updated_at")
    .order("nama");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Kelola Template Surat</h1>
          <p className="text-sm text-slate-500">
            Ubah redaksi surat tanpa developer. Perubahan berlaku untuk surat yang dibuat
            sesudahnya; surat yang sudah terbit tidak ikut berubah.
          </p>
        </div>
        <Link
          href="/dashboard/template-surat/tambah"
          className="shrink-0 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light"
        >
          + Tambah Template
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3">Template</th>
              <th className="px-4 py-3">Cocok dengan layanan berkata</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(daftar || []).map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">{t.nama}</p>
                  <p className="text-xs text-slate-400">Kode: {t.kode}</p>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {(t.kata_kunci || []).join(", ") || "—"}
                </td>
                <td className="px-4 py-3">
                  <ToggleAktifTemplate id={t.id} aktif={t.aktif} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/dashboard/template-surat/${t.id}`}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-navy hover:text-navy"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!daftar || daftar.length === 0) && (
          <p className="px-4 py-8 text-center text-sm text-slate-400">
            Belum ada template. Jalankan migrasi 0020 &amp; 0021.
          </p>
        )}
      </div>
    </div>
  );
}
