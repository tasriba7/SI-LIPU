import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ambilPeriode, formatTanggal, STATUS_VERIFIKASI, JENIS_DAFTAR_LABEL } from "@/lib/pilkades";

export const metadata = { title: "Pilkades" };

export default async function BerandaPilkades() {
  const supabase = await createClient();
  const periode = await ambilPeriode(supabase);

  if (!periode) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-lg font-bold text-amber-800">Belum ada periode Pilkades</h1>
        <p className="mt-2 text-sm text-amber-700">
          Administrator perlu membuat periode lebih dulu di menu{" "}
          <Link href="/dashboard/pilkades/periode" className="underline">
            Periode Pilkades
          </Link>
          .
        </p>
      </div>
    );
  }

  const hitung = async (status) => {
    let q = supabase
      .from("pilkades_pemilih")
      .select("id", { count: "exact", head: true })
      .eq("periode_id", periode.id);
    if (status) q = q.eq("status_verifikasi", status);
    const { count } = await q;
    return count ?? 0;
  };
  const [total, ...perStatus] = await Promise.all([
    hitung(),
    ...Object.keys(STATUS_VERIFIKASI).map((k) => hitung(k)),
  ]);
  const { count: tanpaTps } = await supabase
    .from("pilkades_pemilih")
    .select("id", { count: "exact", head: true })
    .eq("periode_id", periode.id)
    .eq("status_verifikasi", "memenuhi_syarat")
    .is("tps_id", null);

  const { data: arsip } = await supabase
    .from("pilkades_daftar_tetap")
    .select("id, jenis, versi, tanggal_penetapan, jumlah")
    .eq("periode_id", periode.id)
    .order("created_at", { ascending: false });
  const terakhir = ["DPS", "DPT"].map((j) => (arsip ?? []).find((a) => a.jenis === j) ?? { jenis: j });

  const kartu = [
    ["Calon pemilih", total, "text-slate-800"],
    ...Object.entries(STATUS_VERIFIKASI).map(([k, label], i) => [label, perStatus[i], "text-slate-800"]),
    ["Memenuhi syarat, belum punya TPS", tanpaTps ?? 0, "text-amber-700"],
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-800">{periode.nama}</h1>
        <p className="text-sm text-slate-500">
          Pemungutan suara: {formatTanggal(periode.tanggal_pemungutan)}
          {!periode.aktif && " · (periode ini belum diaktifkan)"}
        </p>
      </div>

      {total === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Belum ada calon pemilih. Buka{" "}
          <Link href="/dashboard/pilkades/pemilih" className="font-medium text-navy underline">
            Daftar Pemilih
          </Link>{" "}
          lalu klik &ldquo;Ambil calon pemilih dari data warga&rdquo;.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {terakhir.map((a) => (
          <Link
            key={a.jenis}
            href={a.id ? `/dashboard/pilkades/daftar/${a.id}` : "/dashboard/pilkades/daftar"}
            className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300"
          >
            <p className="text-xs text-slate-500">{JENIS_DAFTAR_LABEL[a.jenis]}</p>
            {a.id ? (
              <p className="mt-1 text-sm text-slate-800">
                <b>Versi {a.versi}</b> · {a.jumlah} pemilih · {formatTanggal(a.tanggal_penetapan)}
              </p>
            ) : (
              <p className="mt-1 text-sm text-slate-400">Belum ditetapkan</p>
            )}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {kartu.map(([label, angka, warna]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">{label}</p>
            <p className={`mt-1 text-2xl font-bold ${warna}`}>{angka}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
