import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { pastikanAdmin } from "@/lib/akses";
import HalamanTerbatas from "@/components/dashboard/HalamanTerbatas";
import { KATEGORI_BADGE_CLASS, KATEGORI_LABEL } from "@/lib/bantuan";
import FormTambahJenis from "./FormTambahJenis";
import ToggleAktifJenis from "./ToggleAktifJenis";

export const metadata = { title: "Jenis Bantuan" };

export default async function JenisBantuanPage() {
  const supabase = await createClient();
  const akses = await pastikanAdmin(supabase);
  if (akses.error) return <HalamanTerbatas />;

  const { data: daftar } = await supabase
    .from("jenis_bantuan")
    .select("id, nama, kategori, penyelenggara, deskripsi, aktif")
    .order("urutan")
    .order("nama");

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <Link href="/dashboard/bantuan" className="text-xs text-slate-400 hover:text-slate-600">
          &larr; Kembali ke Bantuan Desa
        </Link>
        <h1 className="mt-1 text-lg font-bold text-slate-800">Jenis Bantuan</h1>
        <p className="text-sm text-slate-500">
          Daftar bantuan yang lazim diterima warga desa sudah disiapkan. Tambahkan jenis lain bila
          perlu. Jenis yang dinonaktifkan tidak muncul saat menambah penerima dan disembunyikan dari
          warga, tetapi data penerimanya tetap tersimpan.
        </p>
      </div>

      <FormTambahJenis />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <ul className="divide-y divide-slate-100">
          {(daftar ?? []).map((j) => (
            <li key={j.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-slate-800">{j.nama}</p>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      KATEGORI_BADGE_CLASS[j.kategori] ?? KATEGORI_BADGE_CLASS.lainnya
                    }`}
                  >
                    {KATEGORI_LABEL[j.kategori] ?? j.kategori}
                  </span>
                </div>
                {j.penyelenggara && (
                  <p className="text-xs text-slate-400">Penyelenggara: {j.penyelenggara}</p>
                )}
                {j.deskripsi && <p className="mt-0.5 text-xs text-slate-500">{j.deskripsi}</p>}
              </div>
              <ToggleAktifJenis id={j.id} aktif={j.aktif} />
            </li>
          ))}
          {(daftar ?? []).length === 0 && (
            <li className="px-4 py-10 text-center text-sm text-slate-400">
              Belum ada jenis bantuan. Pastikan migrasi 0037_bantuan_desa.sql sudah dijalankan.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
