import { createClient } from "@/lib/supabase/server";
import { ambilRole } from "@/lib/akses";
import { isAdminRole } from "@/lib/roles";
import { formatTanggal } from "@/lib/pilkades";
import { buatPeriode, aktifkanPeriode, ubahTanggalPemungutan } from "@/app/dashboard/pilkades/actions";
import { JudulHalaman, Kartu, tombol, kolom, labelKolom } from "@/components/pilkades/UI";

export const metadata = { title: "Periode Pilkades" };

export default async function PeriodePage() {
  const supabase = await createClient();
  const { role } = await ambilRole(supabase);
  const admin = isAdminRole(role);
  const { data: daftar } = await supabase
    .from("pilkades_periode")
    .select("id, nama, tanggal_pemungutan, aktif")
    .order("created_at", { ascending: false });
  const tglInput = (t) => (t ? String(t).slice(0, 10) : "");

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <JudulHalaman
        judul="Periode Pilkades"
        penjelasan={`Setiap pemilihan punya periode sendiri, misalnya “Pilkades 2026”. Hanya satu periode yang aktif.${admin ? "" : " Periode dibuat oleh Administrator."}`}
      />

      {admin && (
        <Kartu>
          <h2 className="text-base font-bold text-sky-950">Buat periode baru</h2>
          <form action={buatPeriode} className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className={labelKolom}>
              Nama periode
              <input name="nama" required placeholder="Contoh: Pilkades 2026" className={`${kolom} mt-1 font-normal`} />
            </label>
            <label className={labelKolom}>
              Tanggal pemungutan suara
              <input name="tanggal_pemungutan" type="date" className={`${kolom} mt-1 font-normal`} />
            </label>
            <div className="sm:col-span-2"><button className={tombol.utama}>+ Buat periode</button></div>
          </form>
        </Kartu>
      )}

      <ul className="divide-y divide-sky-100 overflow-hidden rounded-xl border border-sky-100 bg-white shadow-sm">
        {(daftar ?? []).map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <p className="text-base font-bold text-slate-900">{p.nama}</p>
              <p className="text-sm text-slate-600">Pemungutan suara: {formatTanggal(p.tanggal_pemungutan)}</p>
              {admin && (
                <form action={ubahTanggalPemungutan} className="mt-2 flex flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={p.id} />
                  <input
                    name="tanggal_pemungutan"
                    type="date"
                    defaultValue={tglInput(p.tanggal_pemungutan)}
                    aria-label={`Tanggal pemungutan suara ${p.nama}`}
                    className={`${kolom} font-normal`}
                  />
                  <button className={tombol.sekunder}>Simpan tanggal</button>
                </form>
              )}
            </div>
            {p.aktif ? (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-800">✓ Aktif</span>
            ) : (
              admin && (
                <form action={aktifkanPeriode}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className={tombol.sekunder}>Jadikan aktif</button>
                </form>
              )
            )}
          </li>
        ))}
        {!daftar?.length && <li className="px-5 py-8 text-center text-sm text-slate-500">Belum ada periode.</li>}
      </ul>
    </div>
  );
}
