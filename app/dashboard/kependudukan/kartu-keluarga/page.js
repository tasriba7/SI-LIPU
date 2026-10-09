import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IconUsers, IconSearch } from "@/components/icons";

const BATAS_TAMPIL = 100;

// Karakter ini punya arti khusus di filter .or() PostgREST. Dibuang dari
// kata kunci supaya pencarian tidak error / tidak bisa menyelipkan filter.
function bersihkanKataKunci(teks) {
  return (teks ?? "").replace(/[,()*\\%]/g, " ").replace(/\s+/g, " ").trim();
}

export default async function KartuKeluargaPage({ searchParams }) {
  const sp = await searchParams;
  const cari = bersihkanKataKunci(sp?.cari);
  const supabase = await createClient();

  let daftarNoKK = []; // urutan tampil
  let cocokPerKK = new Map(); // no_kk -> anggota yang cocok dengan kata kunci
  let jumlahTanpaKK = 0;

  if (cari) {
    // Cari lewat nama / NIK / No. KK anggota mana pun, lalu kumpulkan KK-nya.
    const { data: cocok } = await supabase
      .from("warga")
      .select("id, no_kk, nama_lengkap, status_dalam_kk")
      .eq("status_kependudukan", "aktif")
      .or(`nama_lengkap.ilike.%${cari}%,nik.ilike.%${cari}%,no_kk.ilike.%${cari}%`)
      .order("nama_lengkap")
      .limit(200);

    for (const w of cocok ?? []) {
      if (!w.no_kk) {
        jumlahTanpaKK += 1;
        continue;
      }
      if (!cocokPerKK.has(w.no_kk)) cocokPerKK.set(w.no_kk, []);
      cocokPerKK.get(w.no_kk).push(w);
    }
    daftarNoKK = [...cocokPerKK.keys()].slice(0, BATAS_TAMPIL);

    // Tepat 1 keluarga cocok -> langsung buka detailnya (alur: ketik nama -> lihat keluarga).
    if (daftarNoKK.length === 1 && jumlahTanpaKK === 0) {
      const kk = daftarNoKK[0];
      const anggotaCocok = cocokPerKK.get(kk);
      const sorot = anggotaCocok.length === 1 ? `?warga=${anggotaCocok[0].id}` : "";
      redirect(`/dashboard/kependudukan/keluarga/${kk}${sorot}`);
    }
  } else {
    const { data } = await supabase
      .from("keluarga")
      .select("no_kk")
      .order("no_kk")
      .limit(BATAS_TAMPIL);
    daftarNoKK = (data ?? []).map((k) => k.no_kk);
  }

  const { count: totalKeluarga } = await supabase
    .from("keluarga")
    .select("id", { count: "exact", head: true });

  // Ambil detail hanya untuk KK yang akan ditampilkan (bukan seluruh warga).
  let keluargaPerKK = new Map();
  let anggotaPerKK = new Map();
  if (daftarNoKK.length > 0) {
    const [{ data: daftarKeluarga }, { data: daftarWarga }] = await Promise.all([
      supabase.from("keluarga").select("no_kk, alamat, dusun, rt, rw").in("no_kk", daftarNoKK),
      supabase
        .from("warga")
        .select("no_kk, nama_lengkap, status_dalam_kk")
        .eq("status_kependudukan", "aktif")
        .in("no_kk", daftarNoKK)
        .limit(5000),
    ]);
    keluargaPerKK = new Map((daftarKeluarga ?? []).map((k) => [k.no_kk, k]));
    for (const w of daftarWarga ?? []) {
      if (!anggotaPerKK.has(w.no_kk)) anggotaPerKK.set(w.no_kk, []);
      anggotaPerKK.get(w.no_kk).push(w);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <Link href="/dashboard/kependudukan" className="text-sm text-slate-400 hover:text-slate-600">
          &larr; Kembali ke daftar warga
        </Link>
        <h1 className="mt-2 text-lg font-bold text-slate-800">Kartu Keluarga</h1>
        <p className="text-sm text-slate-500">
          Cari seorang warga (kepala keluarga, istri, atau anak) untuk melihat seluruh isi keluarganya:
          jumlah anggota, pendidikan, pekerjaan, jumlah anak, dan lainnya. Alamat di sini otomatis
          tersinkron dengan alamat seluruh anggotanya.
        </p>
        {typeof totalKeluarga === "number" && (
          <p className="mt-1.5 text-xs font-medium text-navy">
            {totalKeluarga.toLocaleString("id-ID")} Kartu Keluarga tercatat
          </p>
        )}
      </div>

      <form className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-md">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            name="cari"
            defaultValue={cari}
            autoFocus
            placeholder="Ketik nama warga, NIK, atau No. KK..."
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-navy"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light"
        >
          Cari Keluarga
        </button>
        {cari && (
          <Link
            href="/dashboard/kependudukan/kartu-keluarga"
            className="text-sm text-slate-400 hover:text-slate-600"
          >
            Reset
          </Link>
        )}
      </form>

      {cari && jumlahTanpaKK > 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {jumlahTanpaKK} warga yang cocok belum memiliki No. KK, jadi keluarganya belum bisa
          ditampilkan. Lengkapi No. KK mereka lewat menu Edit di Data Kependudukan.
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">No. KK</th>
                <th className="px-4 py-3 font-medium">Kepala Keluarga</th>
                <th className="px-4 py-3 font-medium">Alamat</th>
                <th className="px-4 py-3 font-medium">Dusun / RT-RW</th>
                <th className="px-4 py-3 font-medium">Anggota</th>
                <th className="px-4 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {daftarNoKK.map((noKK) => {
                const k = keluargaPerKK.get(noKK);
                const anggota = anggotaPerKK.get(noKK) ?? [];
                const kepala = anggota.find((a) => a.status_dalam_kk === "Kepala Keluarga");
                const cocok = cocokPerKK.get(noKK) ?? [];
                const href = `/dashboard/kependudukan/keluarga/${noKK}${
                  cocok.length === 1 ? `?warga=${cocok[0].id}` : ""
                }`;
                return (
                  <tr key={noKK} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono text-slate-600">{noKK}</td>
                    <td className="px-4 py-3">
                      {kepala ? (
                        <span className="font-medium text-slate-800">{kepala.nama_lengkap}</span>
                      ) : (
                        <span className="text-xs text-amber-600">Belum ada</span>
                      )}
                      {cocok.length > 0 && (
                        <span className="mt-0.5 block text-xs text-slate-400">
                          Cocok:{" "}
                          {cocok
                            .slice(0, 3)
                            .map((c) => `${c.nama_lengkap}${c.status_dalam_kk ? ` (${c.status_dalam_kk})` : ""}`)
                            .join(", ")}
                          {cocok.length > 3 ? `, +${cocok.length - 3} lainnya` : ""}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{k?.alamat || "-"}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {k?.dusun || "-"} {k?.rt ? `· RT ${k.rt}` : ""} {k?.rw ? `/RW ${k.rw}` : ""}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{anggota.length} orang</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={href} className="text-sm font-medium text-navy hover:underline">
                        Lihat isi keluarga
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {daftarNoKK.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="mx-auto flex max-w-xs flex-col items-center gap-2 text-slate-400">
                      <IconUsers className="h-8 w-8" />
                      <p className="text-sm">
                        {cari
                          ? `Tidak ada keluarga yang cocok dengan "${cari}".`
                          : "Belum ada Kartu Keluarga tercatat."}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        {cari
          ? `Hasil pencarian (maksimal ${BATAS_TAMPIL} keluarga).`
          : `Menampilkan maksimal ${BATAS_TAMPIL} Kartu Keluarga. Gunakan pencarian untuk menemukan keluarga tertentu.`}
      </p>
    </div>
  );
}
