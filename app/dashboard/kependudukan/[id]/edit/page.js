import { ROLE_LABELS } from "@/lib/roles";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import EditWargaForm from "./EditWargaForm";
import { labelKolomKosong } from "@/lib/kelengkapan";
import { ambilPilihanDusun } from "@/lib/wilayah";

const LABEL_ROLE = { ...ROLE_LABELS, kadus: "Kadus", ketua_rt: "Ketua RT" };

export default async function EditWargaPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  // Dibaca dari view `warga_kelengkapan` (bukan tabel `warga` langsung) supaya
  // ikut dapat jejak penginput & daftar kolom yang masih kosong untuk
  // ditampilkan sebagai pemberitahuan di atas form.
  const { data: warga } = await supabase
    .from("warga_kelengkapan")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!warga) notFound();

  const kolomKosong = labelKolomKosong(warga.kolom_kosong);
  const { pilihan: pilihanDusun } = await ambilPilihanDusun(supabase);

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/dashboard/kependudukan"
        className="text-sm text-slate-400 hover:text-slate-600"
      >
        &larr; Kembali ke daftar
      </Link>

      <div>
        <h1 className="text-lg font-bold text-slate-800">Edit Data Warga</h1>
        <p className="text-sm text-slate-500">{warga.nama_lengkap}</p>
        <p className="mt-1 text-xs text-slate-400">
          {warga.dibuat_oleh_nama ? (
            <>
              Ditambahkan oleh <span className="font-medium text-slate-600">{warga.dibuat_oleh_nama}</span>
              {warga.dibuat_oleh_role && ` (${LABEL_ROLE[warga.dibuat_oleh_role] || warga.dibuat_oleh_role})`}
              {warga.dibuat_oleh_wilayah && ` — ${warga.dibuat_oleh_wilayah}`}
            </>
          ) : (
            "Data lama / hasil impor — penginput tidak tercatat."
          )}
          {warga.diubah_oleh_nama && (
            <> · Terakhir diubah oleh <span className="font-medium text-slate-600">{warga.diubah_oleh_nama}</span></>
          )}
        </p>
      </div>

      {kolomKosong.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">Data ini belum lengkap ({kolomKosong.length} kolom kosong)</p>
          <p className="mt-0.5 text-amber-700">
            Belum diisi: {kolomKosong.join(", ")}.
          </p>
        </div>
      )}

      <EditWargaForm warga={warga} pilihanDusun={pilihanDusun} />
    </div>
  );
}
