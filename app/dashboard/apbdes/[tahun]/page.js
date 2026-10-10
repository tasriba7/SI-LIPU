import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JENIS_APBDES, getApbdes, hitungRingkasan, rupiah } from "@/lib/apbdes";
import { bisaMenulis } from "@/lib/roles";
import FormMetaTahun from "./FormMetaTahun";
import PengelolaRincian from "./PengelolaRincian";

export default async function KelolaTahunApbdesPage({ params }) {
  const { tahun: tahunParam } = await params;
  const tahun = Number(tahunParam);
  if (!Number.isInteger(tahun)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profil } = await supabase.from("profiles").select("role").eq("id", user?.id).single();
  const boleh = bisaMenulis(profil?.role);

  const { meta, items } = await getApbdes(supabase, tahun);
  if (!meta) notFound();
  const r = hitungRingkasan(items);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/dashboard/apbdes" className="text-xs text-slate-400 hover:text-navy">
          &larr; Kembali ke APBDes
        </Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-bold text-slate-800">APBDes {tahun}</h1>
          {meta.terbit && (
            <Link href={`/apbdes?tahun=${tahun}`} target="_blank" className="text-xs font-medium text-navy underline">
              Lihat halaman publik
            </Link>
          )}
        </div>
      </div>

      <FormMetaTahun meta={meta} boleh={boleh} />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-400">Pendapatan</p>
          <p className="mt-1 font-semibold text-navy">{rupiah(r.pendapatan.anggaran)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-400">Belanja</p>
          <p className="mt-1 font-semibold text-navy">{rupiah(r.belanja.anggaran)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-400">
            {r.surplus.anggaran >= 0 ? "Surplus" : "Defisit"} (pendapatan − belanja)
          </p>
          <p className={`mt-1 font-semibold ${r.surplus.anggaran < 0 ? "text-red-600" : "text-navy"}`}>
            {rupiah(Math.abs(r.surplus.anggaran))}
          </p>
        </div>
      </div>

      {JENIS_APBDES.map((j) => (
        <PengelolaRincian
          key={j.nilai}
          tahun={tahun}
          jenis={j.nilai}
          label={j.label}
          contoh={j.contoh}
          items={items.filter((i) => i.jenis === j.nilai)}
          total={r[j.nilai]}
          boleh={boleh}
        />
      ))}
    </div>
  );
}
