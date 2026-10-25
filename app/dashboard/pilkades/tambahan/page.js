import { createClient } from "@/lib/supabase/server";
import { ambilRole } from "@/lib/akses";
import { bisaUbahPilkades } from "@/lib/roles";
import { ambilPeriode, formatTanggal } from "@/lib/pilkades";
import { kunciHalaman } from "@/lib/pilkadesKunci";
import TahapTerkunci from "@/components/pilkades/TahapTerkunci";
import TombolKonfirmasi from "@/components/pilkades/TombolKonfirmasi";
import { JudulHalaman, Kartu, KosongPandu, Catatan, tombol, kolom, kolomKecil, labelKolom } from "@/components/pilkades/UI";
import PesanSekali from "@/components/pilkades/PesanSekali";
import { pesanDari, teknis, COBA_LAGI } from "@/lib/pilkadesPesan";
import { tambahPemilihTambahan, batalPemilihTambahan } from "../actions";

export const metadata = { title: "Pemilih Tambahan — Pilkades" };

const PESAN_HASIL = {
  ok: ["sukses", "Pemilih Tambahan dicatat", "Pemilih ini sudah masuk daftar hadir dan Surat Undangan. DPT tidak berubah."],
  batal: ["sukses", "Pemilih Tambahan dibatalkan", "Pembatalan tercatat di Riwayat beserta alasannya."],
  gagal: (sp) => ["bahaya", "Belum berhasil", sp.pesan || COBA_LAGI],
};

export default async function TambahanPage({ searchParams }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const periode = await ambilPeriode(supabase);
  const { role } = await ambilRole(supabase);
  const bisaUbah = bisaUbahPilkades(role);
  if (!periode) {
    return <KosongPandu judul="Belum ada periode Pilkades" href="/dashboard/pilkades/pengaturan/periode" label="Buka Periode Pilkades" />;
  }
  const kunci = await kunciHalaman(supabase, periode, "/dashboard/pilkades/tambahan");
  if (kunci) return <TahapTerkunci kunci={kunci} />;

  const cari = String(sp.cari ?? "").trim().slice(0, 50);
  const [tmbRes, tpsRes, cariRes] = await Promise.all([
    supabase.from("pilkades_pemilih_tambahan")
      .select("id, nama_lengkap, nik_samar, dusun, rt, rw, tps_nama, alasan, dicatat_oleh_nama, created_at")
      .eq("periode_id", periode.id).order("created_at", { ascending: false }),
    supabase.from("pilkades_tps").select("id, nama").eq("periode_id", periode.id).order("nama"),
    bisaUbah && cari.length >= 3
      ? supabase.rpc("pilkades_cari_warga_tambahan", { p_periode: periode.id, p_cari: cari })
      : Promise.resolve({ data: null, error: null }),
  ]);
  const tambahan = tmbRes.data ?? [];
  const tps = tpsRes.data ?? [];
  const hasilCari = cariRes.data ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <JudulHalaman
        judul="Pemilih Tambahan"
        penjelasan="Untuk warga yang berhak memilih tetapi terlewat dari DPT. DPT yang sudah ditetapkan tidak diubah; nama yang ditambahkan di sini dicatat terpisah, lengkap dengan alasannya, dan ikut masuk daftar hadir serta Surat Undangan."
      />
      <PesanSekali pesan={pesanDari(PESAN_HASIL, sp)} bersihkan={["hasil", "pesan"]} />
      <Catatan
        butir={[
          (tmbRes.error || tpsRes.error) && { jenis: "bahaya", judul: "Data gagal dimuat", isi: `Muat ulang halaman ini.${teknis(role, "0066")}` },
          cariRes.error && { jenis: "perhatian", judul: "Pencarian belum berhasil", isi: cariRes.error.code === "P0001" ? cariRes.error.message : COBA_LAGI },
        ]}
      />

      {bisaUbah && (
        <Kartu className="space-y-4">
          <h2 className="text-base font-bold text-sky-950">Cari warga</h2>
          <form className="flex flex-wrap items-end gap-3">
            <label className={`${labelKolom} grow`}>
              Nama (minimal 3 huruf) atau NIK lengkap
              <input name="cari" defaultValue={cari} className={`${kolom} mt-1 font-normal`} />
            </label>
            <button className={tombol.utama}>Cari</button>
          </form>

          {cari.length >= 3 && !cariRes.error && (
            hasilCari.length === 0 ? (
              <p className="text-sm text-slate-700">Tidak ada warga yang cocok.</p>
            ) : (
              <ul className="divide-y divide-sky-100 rounded-xl border border-sky-100">
                {hasilCari.map((w) => (
                  <li key={w.warga_id} className="space-y-3 p-4">
                    <div>
                      <p className="text-base font-bold text-slate-900">{w.nama_lengkap}</p>
                      <p className="text-sm text-slate-600">
                        NIK {w.nik_samar} · {w.jenis_kelamin ?? "-"} · {w.umur} tahun · {[w.dusun, w.rt && `RT ${w.rt}`, w.rw && `RW ${w.rw}`].filter(Boolean).join(" · ") || "alamat belum diisi"}
                      </p>
                    </div>
                    {w.alasan_tidak ? (
                      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">Belum bisa ditambahkan: {w.alasan_tidak}</p>
                    ) : tps.length === 0 ? (
                      <p className="text-sm text-slate-700">Belum ada TPS.</p>
                    ) : (
                      <form action={tambahPemilihTambahan} className="grid gap-3 sm:grid-cols-3">
                        <input type="hidden" name="periode_id" value={periode.id} />
                        <input type="hidden" name="warga_id" value={w.warga_id} />
                        <label className={labelKolom}>
                          TPS
                          <select name="tps_id" required className={`${kolomKecil} mt-1 w-full font-normal`}>
                            {tps.map((t) => <option key={t.id} value={t.id}>{t.nama}</option>)}
                          </select>
                        </label>
                        <label className={`${labelKolom} sm:col-span-2`}>
                          Alasan <span className="font-normal text-slate-600">(minimal 5 huruf, tercatat di Riwayat)</span>
                          <input name="alasan" required minLength={5} maxLength={300} placeholder="Contoh: terlewat saat pendataan" className={`${kolomKecil} mt-1 w-full font-normal`} />
                        </label>
                        <div className="sm:col-span-3">
                          <TombolKonfirmasi pesan={`Catat ${w.nama_lengkap} sebagai Pemilih Tambahan?`} className={tombol.utama}>Catat sebagai Pemilih Tambahan</TombolKonfirmasi>
                        </div>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )
          )}
        </Kartu>
      )}

      <section className="space-y-3">
        <h2 className="text-base font-bold text-sky-950">Sudah dicatat ({tambahan.length})</h2>
        {tambahan.length === 0 ? (
          <KosongPandu judul="Belum ada Pemilih Tambahan" teks={bisaUbah ? "Cari warga di atas bila ada yang terlewat dari DPT." : "Pemilih Tambahan dicatat oleh Panitia Pilkades."} />
        ) : (
          <ul className="divide-y divide-sky-100 overflow-hidden rounded-xl border border-sky-100 bg-white shadow-sm">
            {tambahan.map((t) => (
              <li key={t.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                <div>
                  <p className="text-base font-bold text-slate-900">{t.nama_lengkap}</p>
                  <p className="text-sm text-slate-600">{t.tps_nama} · NIK {t.nik_samar} · dicatat {formatTanggal(t.created_at)}{t.dicatat_oleh_nama ? ` oleh ${t.dicatat_oleh_nama}` : ""}</p>
                  <p className="mt-1 text-sm text-slate-800"><b>Alasan:</b> {t.alasan}</p>
                </div>
                {bisaUbah && (
                  <details className="rounded-xl border border-red-100 p-3">
                    <summary className="cursor-pointer text-sm font-semibold text-red-700">Batalkan</summary>
                    <form action={batalPemilihTambahan} className="mt-3 space-y-3">
                      <input type="hidden" name="id" value={t.id} />
                      <label className={labelKolom}>
                        Alasan pembatalan <span className="font-normal text-slate-600">(minimal 5 huruf)</span>
                        <input name="alasan" required minLength={5} maxLength={300} className={`${kolomKecil} mt-1 w-full font-normal`} />
                      </label>
                      <TombolKonfirmasi pesan={`Batalkan Pemilih Tambahan ${t.nama_lengkap}?`} className={tombol.bahaya}>Batalkan</TombolKonfirmasi>
                    </form>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
