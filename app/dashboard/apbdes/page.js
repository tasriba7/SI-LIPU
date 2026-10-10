import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDaftarTahunAdmin, rupiahRingkas } from "@/lib/apbdes";
import { bisaMenulis } from "@/lib/roles";
import FormBuatTahun from "./FormBuatTahun";

export default async function ApbdesAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profil } = await supabase.from("profiles").select("role").eq("id", user?.id).single();
  const boleh = bisaMenulis(profil?.role);
  const daftar = await getDaftarTahunAdmin(supabase);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-slate-800">APBDes</h1>
        <p className="text-sm text-slate-500">
          Anggaran Pendapatan dan Belanja Desa. Siapkan sebagai draf, lalu terbitkan agar tampil di halaman
          APBDes publik dan ringkasannya di beranda.
        </p>
      </div>

      {boleh && <FormBuatTahun adaTahunLain={daftar.length > 0} />}

      {daftar.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-14 text-center">
          <p className="text-sm text-slate-400">Belum ada data APBDes.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {daftar.map((t) => (
            <Link
              key={t.tahun}
              href={`/dashboard/apbdes/${t.tahun}`}
              className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-navy hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <p className="font-display text-2xl font-bold text-navy">{t.tahun}</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    t.terbit ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {t.terbit ? "Terbit" : "Draf"}
                </span>
              </div>
              <dl className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-400">Pendapatan</dt>
                  <dd className="font-medium text-slate-700">{rupiahRingkas(t.ringkasan.pendapatan.anggaran)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Belanja</dt>
                  <dd className="font-medium text-slate-700">{rupiahRingkas(t.ringkasan.belanja.anggaran)}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs font-medium text-navy">{boleh ? "Kelola rincian →" : "Lihat rincian →"}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
