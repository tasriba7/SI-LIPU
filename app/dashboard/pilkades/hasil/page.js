import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ambilRole } from "@/lib/akses";
import { bisaUbahPilkades } from "@/lib/roles";
import { ambilPeriode, ambilRekapSuara, tentukanPemenang, formatTanggal } from "@/lib/pilkades";
import { simpanSuaraTps, tetapkanTerpilih, batalkanPenetapan } from "../actions";
import TombolKonfirmasi from "@/components/pilkades/TombolKonfirmasi";
import { JudulHalaman, Pesan, Kartu, KosongPandu, tombol, kolom, kolomKecil, labelKolom } from "@/components/pilkades/UI";

export const metadata = { title: "Hasil Suara — Pilkades" };

const persenDari = (n, total) => (total ? Math.round((n / total) * 1000) / 10 : 0);

export default async function HasilPage({ searchParams }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const periode = await ambilPeriode(supabase);
  const { role } = await ambilRole(supabase);
  const bisaUbah = bisaUbahPilkades(role);
  if (!periode) {
    return <KosongPandu judul="Belum ada periode Pilkades" href="/dashboard/pilkades/periode" label="Buka Periode Pilkades" />;
  }

  const rekap = await ambilRekapSuara(supabase, periode.id);
  const { calon, tps, total, hasil } = rekap;

  if (!rekap.error && !calon.length) {
    return (
      <div className="mx-auto max-w-5xl">
        <KosongPandu
          judul="Belum ada calon yang ditetapkan"
          teks="Suara hanya bisa dicatat untuk calon berstatus “Ditetapkan sebagai calon”. Lengkapi data calon dulu."
          href="/dashboard/pilkades/calon"
          label="Ke Calon Kepala Desa"
        />
      </div>
    );
  }

  const { pemenang, seri } = tentukanPemenang(rekap);
  const lengkap = tps.length > 0 && total.tpsDiisi === tps.length;
  const calonTerpilih = hasil ? calon.find((c) => c.id === hasil.calon_id) : null;
  const tpsDibuka = tps.find((t) => t.id === sp.tps)?.id ?? null;
  const urutHasil = [...calon].sort((a, b) => (total.perCalon[b.id] ?? 0) - (total.perCalon[a.id] ?? 0));

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <JudulHalaman
        judul={`Hasil Suara — ${periode.nama}`}
        penjelasan="Masukkan hasil hitung suara tiap TPS dari berita acara TPS. Yang dicatat hanya angka per calon, bukan pilihan individu. Setelah semua TPS terisi, calon terpilih bisa ditetapkan dan berita acara dicetak."
      />

      {sp.hasil === "ok" && <Pesan jenis="sukses" judul="Rekap TPS tersimpan">Tercatat di Riwayat Aktivitas.</Pesan>}
      {sp.hasil === "terpilih" && <Pesan jenis="sukses" judul="Calon terpilih ditetapkan">Berita acara sekarang bisa dicetak.</Pesan>}
      {sp.hasil === "batal" && <Pesan jenis="sukses" judul="Penetapan dibatalkan">Suara bisa diperbaiki lagi. Pembatalan tercatat di Riwayat beserta alasannya.</Pesan>}
      {sp.hasil === "gagal" && <Pesan jenis="bahaya" judul="Tidak berhasil">{sp.pesan || "Silakan coba lagi. Pastikan migrasi 0060 sudah dijalankan."}</Pesan>}
      {rekap.error && <Pesan jenis="bahaya" judul="Data gagal dimuat">Pastikan migrasi 0054, 0055, dan 0060 sudah dijalankan.</Pesan>}
      {!bisaUbah && <Pesan jenis="info">Hasil suara dicatat oleh Panitia Pilkades. Akun ini hanya dapat melihat.</Pesan>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["TPS sudah diisi", `${total.tpsDiisi} / ${tps.length}`, "border-sky-200 bg-sky-50 text-sky-800"],
          ["Pemilih hadir", total.hadir, "border-slate-200 bg-slate-50 text-slate-800"],
          ["Suara sah", total.sah, "border-emerald-200 bg-emerald-50 text-emerald-800"],
          ["Suara tidak sah", total.tidakSah, "border-amber-200 bg-amber-50 text-amber-800"],
        ].map(([label, n, gaya]) => (
          <div key={label} className={`rounded-xl border p-4 ${gaya}`}>
            <p className="text-sm font-semibold text-slate-800">{label}</p>
            <p className="mt-1 text-2xl font-extrabold">{n}</p>
          </div>
        ))}
      </div>

      <Kartu>
        <h2 className="text-base font-bold text-sky-950">Perolehan suara per calon</h2>
        {!lengkap && <p className="mt-1 text-sm text-slate-600">Sementara: baru {total.tpsDiisi} dari {tps.length} TPS yang diisi.</p>}
        <div className="mt-3 space-y-3">
          {urutHasil.map((c) => {
            const n = total.perCalon[c.id] ?? 0;
            const p = persenDari(n, total.sah);
            return (
              <div key={c.id}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <p className="font-semibold text-slate-900">No. {c.nomor_urut} — {c.nama}{calonTerpilih?.id === c.id && <span className="ml-2 rounded-full bg-emerald-100 px-3 py-0.5 text-sm font-bold text-emerald-800">Terpilih</span>}</p>
                  <p className="shrink-0 font-extrabold text-sky-950">{n} <span className="text-sm font-semibold text-slate-600">({p}%)</span></p>
                </div>
                <div className="mt-1 h-3 rounded-full bg-slate-100">
                  <div className="h-3 rounded-full bg-sky-600" style={{ width: `${p}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Kartu>

      <Kartu>
        <h2 className="text-base font-bold text-sky-950">Rekap per TPS</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-sm font-bold text-sky-900">
              <tr>
                <th className="py-2 pr-4">TPS</th>
                <th className="py-2 pr-4">Hadir</th>
                {calon.map((c) => <th key={c.id} className="py-2 pr-4">No. {c.nomor_urut}</th>)}
                <th className="py-2 pr-4">Tidak sah</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tps.map((t) => (
                <tr key={t.id}>
                  <td className="py-2 pr-4 font-semibold text-slate-900">{t.nama}</td>
                  <td className="py-2 pr-4">{t.hadir}</td>
                  {calon.map((c) => <td key={c.id} className="py-2 pr-4">{t.diisi ? (t.suara[c.id] ?? 0) : "–"}</td>)}
                  <td className="py-2 pr-4">{t.diisi ? t.tidakSah : "–"}</td>
                  <td className="py-2 pr-4">
                    {t.diisi
                      ? <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-sm font-semibold text-emerald-800">Sudah diisi</span>
                      : <span className="rounded-full bg-amber-100 px-3 py-0.5 text-sm font-semibold text-amber-800">Belum diisi</span>}
                  </td>
                </tr>
              ))}
              {!tps.length && <tr><td colSpan={calon.length + 4} className="py-6 text-center text-slate-500">Belum ada TPS.</td></tr>}
            </tbody>
          </table>
        </div>
      </Kartu>

      {bisaUbah && !hasil && tps.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-bold text-sky-950">Isi atau ubah hasil per TPS</h2>
          {tps.map((t) => (
            <details key={t.id} open={tpsDibuka === t.id} className="rounded-xl border border-sky-100 bg-white p-4 shadow-sm">
              <summary className="cursor-pointer text-sm font-bold text-sky-900">
                {t.nama} <span className="font-normal text-slate-600">— {t.hadir} pemilih tercatat hadir{t.diisi ? " · sudah diisi" : ""}</span>
              </summary>
              <form action={simpanSuaraTps} className="mt-4 grid gap-4 sm:grid-cols-2">
                <input type="hidden" name="periode_id" value={periode.id} />
                <input type="hidden" name="tps_id" value={t.id} />
                {calon.map((c) => (
                  <label key={c.id} className={labelKolom}>
                    No. {c.nomor_urut} — {c.nama}
                    <input type="number" name={`suara_${c.id}`} min="0" max="999999" step="1" required inputMode="numeric"
                      defaultValue={t.diisi ? (t.suara[c.id] ?? 0) : ""} className={`${kolom} mt-1 font-normal`} />
                  </label>
                ))}
                <label className={labelKolom}>
                  Suara tidak sah
                  <input type="number" name="tidak_sah" min="0" max="999999" step="1" required inputMode="numeric"
                    defaultValue={t.diisi ? t.tidakSah : ""} className={`${kolom} mt-1 font-normal`} />
                </label>
                <p className="text-sm text-slate-600 sm:col-span-2">
                  Isi 0 bila tidak ada. Jumlah suara sah + tidak sah tidak boleh melebihi pemilih yang tercatat hadir di TPS ini ({t.hadir}).
                </p>
                <div className="sm:col-span-2">
                  <button className={t.diisi ? tombol.sekunder : tombol.utama}>{t.diisi ? "Simpan perubahan" : "Simpan hasil TPS ini"}</button>
                </div>
              </form>
            </details>
          ))}
        </section>
      )}

      <Kartu>
        <h2 className="text-base font-bold text-sky-950">Penetapan calon terpilih</h2>
        {hasil ? (
          <div className="mt-3 space-y-3">
            <Pesan jenis="sukses" judul={`Terpilih: No. ${calonTerpilih?.nomor_urut ?? "-"} ${calonTerpilih?.nama ?? ""}`}>
              {hasil.suara_calon} dari {hasil.suara_sah_total} suara sah. Ditetapkan {formatTanggal(hasil.tanggal_penetapan)}
              {hasil.nomor_berita_acara ? ` · BA ${hasil.nomor_berita_acara}` : ""}.
            </Pesan>
            <div className="flex flex-wrap items-start gap-3">
              <Link href="/cetak/pilkades/berita-acara" target="_blank" className={tombol.utama}>Cetak Berita Acara</Link>
              {bisaUbah && (
                <details className="rounded-xl border border-red-100 p-3">
                  <summary className="cursor-pointer text-sm font-semibold text-red-700">Batalkan penetapan</summary>
                  <form action={batalkanPenetapan} className="mt-3 space-y-3">
                    <input type="hidden" name="periode_id" value={periode.id} />
                    <label className={labelKolom}>
                      Alasan pembatalan <span className="font-normal text-slate-600">(minimal 5 huruf, tercatat di Riwayat)</span>
                      <input name="alasan" required minLength={5} maxLength={300} className={`${kolomKecil} mt-1 w-full font-normal`} />
                    </label>
                    <TombolKonfirmasi pesan="Batalkan penetapan calon terpilih? Suara akan bisa diubah lagi." className={tombol.bahaya}>Batalkan penetapan</TombolKonfirmasi>
                  </form>
                </details>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {!lengkap && <Pesan jenis="perhatian" judul="Rekap belum lengkap">Calon terpilih baru bisa ditetapkan setelah semua {tps.length} TPS diisi ({total.tpsDiisi} sudah).</Pesan>}
            {lengkap && seri && <Pesan jenis="perhatian" judul="Suara terbanyak seri">Aplikasi tidak menetapkan otomatis. Ikuti ketentuan daerah Anda (misalnya pemilihan ulang).</Pesan>}
            {lengkap && !seri && !pemenang && <Pesan jenis="perhatian" judul="Belum ada suara sah">Periksa kembali angka yang dimasukkan.</Pesan>}
            {lengkap && pemenang && (
              <Pesan jenis="info" judul={`Suara terbanyak: No. ${pemenang.nomor_urut} ${pemenang.nama}`}>
                {total.perCalon[pemenang.id]} dari {total.sah} suara sah. Aplikasi menetapkan berdasarkan suara terbanyak; bila aturan daerah Anda berbeda, jangan gunakan tombol ini.
              </Pesan>
            )}
            {lengkap && pemenang && bisaUbah && (
              <form action={tetapkanTerpilih} className="grid gap-4 sm:grid-cols-2">
                <input type="hidden" name="periode_id" value={periode.id} />
                <label className={labelKolom}>
                  Tanggal penetapan
                  <input type="date" name="tanggal_penetapan" required className={`${kolom} mt-1 font-normal`} />
                </label>
                <label className={labelKolom}>
                  Nomor berita acara <span className="font-normal text-slate-600">(boleh kosong)</span>
                  <input name="nomor_berita_acara" maxLength={100} className={`${kolom} mt-1 font-normal`} />
                </label>
                <label className={`${labelKolom} sm:col-span-2`}>
                  Catatan <span className="font-normal text-slate-600">(boleh kosong)</span>
                  <input name="catatan" maxLength={300} className={`${kolom} mt-1 font-normal`} />
                </label>
                <label className="flex items-start gap-3 rounded-xl bg-sky-50 p-4 text-sm text-slate-900 sm:col-span-2">
                  <input type="checkbox" name="konfirmasi" value="ya" required className="mt-1 h-5 w-5" />
                  <span>Saya menyatakan angka rekap tiap TPS sudah dicocokkan dengan berita acara TPS. Suara terkunci setelah penetapan (bisa dibatalkan dengan alasan).</span>
                </label>
                <div className="sm:col-span-2">
                  <TombolKonfirmasi pesan={`Tetapkan No. ${pemenang.nomor_urut} ${pemenang.nama} sebagai calon terpilih?`} className={tombol.hijau}>
                    Tetapkan calon terpilih
                  </TombolKonfirmasi>
                </div>
              </form>
            )}
            <div>
              <Link href="/cetak/pilkades/berita-acara" target="_blank" className={tombol.sekunder}>Pratinjau Berita Acara (draf)</Link>
            </div>
          </div>
        )}
      </Kartu>
    </div>
  );
}
