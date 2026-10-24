import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ambilRole } from "@/lib/akses";
import { bisaUbahPilkades } from "@/lib/roles";
import {
  ambilPeriode, ambilDaftarPemilih, hitungUmur, formatTanggal, terlaluMuda, STATUS_VERIFIKASI, STATUS_BADGE_CLASS,
} from "@/lib/pilkades";
import { simpanPemilih, terapkanFilterUsia } from "../actions";
import PanduanLangkah from "@/components/pilkades/PanduanLangkah";
import TombolKonfirmasi from "@/components/pilkades/TombolKonfirmasi";
import { JudulHalaman, Pesan, Kartu, KosongPandu, tombol, kolomKecil } from "@/components/pilkades/UI";

export const metadata = { title: "Periksa Pemilih" };
const PER_HALAMAN = 30;

export default async function PemilihPage({ searchParams }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const periode = await ambilPeriode(supabase);
  const { role } = await ambilRole(supabase);
  const bisaUbah = bisaUbahPilkades(role);
  if (!periode) {
    return <KosongPandu judul="Belum ada periode Pilkades" href="/dashboard/pilkades/periode" label="Buka Periode Pilkades" />;
  }

  const { data: semua, error } = await ambilDaftarPemilih(supabase, periode.id);
  if (!error && !(semua ?? []).length) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <PanduanLangkah aktif="periksa" />
        <KosongPandu
          judul="Belum ada calon pemilih"
          teks="Ambil data warga dulu, baru daftar ini bisa diperiksa."
          href="/dashboard/pilkades/ambil"
          label="Ke Langkah 1: Ambil Data Warga"
        />
      </div>
    );
  }

  // Pratinjau saringan usia (hanya menghitung, tidak mengubah data).
  const usiaForm = Number.isInteger(parseInt(sp.usia, 10)) ? parseInt(sp.usia, 10) : (periode.usia_minimum ?? 17);
  const kawinForm = sp.usia === undefined ? periode.termasuk_pernah_kawin !== false : sp.kawin === "1";
  let pratinjau = null;
  if (sp.usia !== undefined && usiaForm >= 0 && usiaForm <= 120) {
    const { data } = await supabase.rpc("pilkades_pratinjau_usia", {
      p_periode: periode.id, p_usia: usiaForm, p_kawin: kawinForm,
    });
    pratinjau = Array.isArray(data) ? data[0] : data;
  }

  const acuan = periode.tanggal_pemungutan ? new Date(periode.tanggal_pemungutan) : new Date();
  const dusunList = [...new Set((semua ?? []).map((r) => r.dusun).filter(Boolean))].sort();
  const cari = (sp.cari ?? "").toString().toLowerCase();
  const fDusun = sp.dusun ?? "";
  const fStatus = sp.status ?? "";
  const sembunyi = (r) => r.status_verifikasi === "tidak_memenuhi" || terlaluMuda(r, periode, acuan);
  const hasil = (semua ?? []).filter(
    (r) =>
      (!cari || r.nama_lengkap.toLowerCase().includes(cari)) &&
      (!fDusun || r.dusun === fDusun) &&
      (fStatus === "semua" || (fStatus ? r.status_verifikasi === fStatus : !sembunyi(r)))
  );
  const jumlahDisembunyikan = fStatus ? 0 : (semua ?? []).filter(sembunyi).length;
  const halaman = Math.max(1, parseInt(sp.hal ?? "1", 10) || 1);
  const totalHal = Math.max(1, Math.ceil(hasil.length / PER_HALAMAN));
  const tampil = hasil.slice((halaman - 1) * PER_HALAMAN, halaman * PER_HALAMAN);

  const qs = (o) => {
    const p = new URLSearchParams({ cari: sp.cari ?? "", dusun: fDusun, status: fStatus, ...o });
    for (const [k, v] of [...p]) if (!v) p.delete(k);
    return `?${p.toString()}`;
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PanduanLangkah aktif="periksa" />
      <JudulHalaman
        langkah={2}
        judul="Periksa Pemilih"
        penjelasan="Tentukan siapa yang berhak memilih. Pilih “Memenuhi syarat” bagi yang berhak. Aturan syarat mengikuti Pilkades daerah dan ditentukan panitia."
      />

      {sp.filter === "ok" && (
        <Pesan jenis="sukses" judul="Saringan usia sudah diterapkan">
          {sp.m} ditandai memenuhi syarat · {sp.t} tidak memenuhi syarat (kurang usia) · {sp.p ?? 0} perlu dicek · {sp.b} masih belum diperiksa.
        </Pesan>
      )}
      {sp.filter === "gagal" && (
        <Pesan jenis="bahaya" judul="Saringan usia gagal diterapkan">
          Pastikan migrasi 0056 sudah dijalankan dan Anda masuk sebagai panitia.
        </Pesan>
      )}
      {error && <Pesan jenis="bahaya">Daftar gagal dimuat. Pastikan migrasi 0051 sudah dijalankan.</Pesan>}

      {/* Cara cepat: saring usia */}
      <details open={!!pratinjau} className="group rounded-2xl border-2 border-sky-100 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5">
          <span>
            <span className="block text-lg font-bold text-sky-950">⚡ Cara cepat: saring otomatis berdasarkan usia</span>
            <span className="block text-base text-slate-700">Tandai yang belum cukup umur sekaligus, tidak perlu satu per satu.</span>
          </span>
          <span className="text-sm font-bold text-sky-700 group-open:hidden">Buka</span>
          <span className="hidden text-sm font-bold text-sky-700 group-open:inline">Tutup</span>
        </summary>
        <div className="space-y-4 border-t-2 border-sky-100 p-5">
          <p className="text-base text-slate-700">
            Usia dihitung pada hari pemungutan suara{periode.tanggal_pemungutan ? ` (${formatTanggal(periode.tanggal_pemungutan)})` : " (tanggal belum diisi, memakai hari ini)"}.
            {!bisaUbah && ` Aturan saat ini: minimal ${periode.usia_minimum ?? 17} tahun${periode.termasuk_pernah_kawin === false ? "" : " atau sudah/pernah kawin"}.`}
          </p>
          <form className="flex flex-wrap items-end gap-4">
            <label className="text-base font-semibold text-slate-800">
              Usia minimal (tahun)
              <input type="number" name="usia" min="0" max="120" defaultValue={usiaForm} className={`${kolomKecil} mt-1 block w-28`} />
            </label>
            <label className="flex items-center gap-2 pb-2 text-base text-slate-800">
              <input type="checkbox" name="kawin" value="1" defaultChecked={kawinForm} className="h-5 w-5" />
              Yang sudah/pernah menikah tetap boleh
            </label>
            <button className={tombol.sekunder}>Hitung dulu (belum mengubah data)</button>
          </form>

          {pratinjau && (
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-5">
                {[
                  ["Total calon", pratinjau.total, "text-slate-900"],
                  ["Cukup usia", pratinjau.layak, "text-emerald-700"],
                  ["Belum cukup usia", pratinjau.di_bawah_usia, "text-red-700"],
                  ["Datanya tidak wajar", pratinjau.perlu_dicek, "text-amber-700"],
                  ["Sudah diatur manual", pratinjau.dikunci_manual, "text-slate-600"],
                ].map(([label, n, warna]) => (
                  <div key={label} className="rounded-xl bg-sky-50 px-3 py-2">
                    <p className="text-sm text-slate-700">{label}</p>
                    <p className={`text-2xl font-extrabold ${warna}`}>{n}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-slate-600">“Sudah diatur manual” = sudah Anda tentukan sendiri, tidak akan diubah. Tanggal acuan: {formatTanggal(pratinjau.tanggal_acuan)}.</p>
              {bisaUbah && (
                <form action={terapkanFilterUsia} className="space-y-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
                  <input type="hidden" name="periode_id" value={periode.id} />
                  <input type="hidden" name="usia" value={usiaForm} />
                  <input type="hidden" name="kawin" value={kawinForm ? "1" : "0"} />
                  <p className="text-base font-semibold text-amber-950">
                    {pratinjau.di_bawah_usia} orang akan ditandai “Tidak memenuhi syarat”. Ini masih bisa diubah lagi per orang.
                  </p>
                  <label className="flex items-start gap-2 text-base text-amber-950">
                    <input type="checkbox" name="tandai" value="1" className="mt-1 h-5 w-5" />
                    <span>
                      Tandai juga {pratinjau.layak} orang yang cukup usia sebagai “Memenuhi syarat”.
                      <span className="block text-sm">Centang hanya bila syarat lain (misalnya tinggal di desa) pasti terpenuhi.</span>
                    </span>
                  </label>
                  <TombolKonfirmasi
                    className={tombol.utama}
                    pesan={`Tandai ${pratinjau.di_bawah_usia} orang sebagai “Tidak memenuhi syarat”?`}
                  >
                    Terapkan Saringan Usia
                  </TombolKonfirmasi>
                </form>
              )}
            </div>
          )}
        </div>
      </details>

      {/* Cari & tampilkan */}
      <Kartu>
        <form className="flex flex-wrap items-end gap-3">
          <label className="flex-1 basis-48 text-base font-semibold text-slate-800">
            Cari nama
            <input name="cari" defaultValue={sp.cari ?? ""} placeholder="Ketik nama…" className={`${kolomKecil} mt-1 block w-full`} />
          </label>
          <label className="text-base font-semibold text-slate-800">
            Dusun
            <select name="dusun" defaultValue={fDusun} className={`${kolomKecil} mt-1 block`}>
              <option value="">Semua dusun</option>
              {dusunList.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
          <label className="text-base font-semibold text-slate-800">
            Tampilkan
            <select name="status" defaultValue={fStatus} className={`${kolomKecil} mt-1 block`}>
              <option value="">Semua, kecuali yang tidak memenuhi syarat</option>
              <option value="semua">Semua, termasuk yang tidak memenuhi syarat</option>
              {Object.entries(STATUS_VERIFIKASI).map(([k, v]) => <option key={k} value={k}>Hanya: {v}</option>)}
            </select>
          </label>
          <button className={tombol.sekunder}>Tampilkan</button>
        </form>
        <p className="mt-3 text-base text-slate-700">
          Menampilkan <b>{hasil.length}</b> orang
          {jumlahDisembunyikan > 0 && ` (${jumlahDisembunyikan} orang yang belum cukup umur atau tidak memenuhi syarat disembunyikan)`}.
        </p>
      </Kartu>

      {/* Tabel */}
      <div className="overflow-x-auto rounded-2xl border-2 border-sky-100 bg-white shadow-sm">
        <table className="w-full text-left text-base">
          <thead className="bg-sky-50 text-sm font-bold text-sky-900">
            <tr>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Umur</th>
              <th className="px-4 py-3">Dusun, RT/RW</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Catatan</th>
              <th className="px-4 py-3"><span className="sr-only">Simpan</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tampil.map((r) => {
              const formId = `f-${r.id}`;
              const umur = hitungUmur(r.tanggal_lahir, acuan);
              return (
                <tr key={`${r.id}-${r.status_verifikasi}-${r.catatan ?? ""}`} className="align-top">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{r.nama_lengkap}</p>
                    <p className="text-sm text-slate-500">NIK {r.nik_samar} · {r.jenis_kelamin === "L" ? "Laki-laki" : r.jenis_kelamin === "P" ? "Perempuan" : "-"}</p>
                  </td>
                  <td className="px-4 py-3">
                    {umur ?? "-"}
                    {umur === 0 && <span className="block text-sm font-semibold text-amber-700">cek tanggal lahir</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-800">
                    {r.dusun ?? "-"}
                    <br />
                    {r.rt || r.rw ? `RT ${r.rt ?? "-"} / RW ${r.rw ?? "-"}` : <span className="font-semibold text-amber-700">RT/RW kosong</span>}
                  </td>
                  <td className="px-4 py-3">
                    <select disabled={!bisaUbah} form={formId} name="status_verifikasi" defaultValue={r.status_verifikasi} className={`${kolomKecil} font-semibold ${STATUS_BADGE_CLASS[r.status_verifikasi]}`}>
                      {Object.entries(STATUS_VERIFIKASI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input readOnly={!bisaUbah} form={formId} name="catatan" defaultValue={r.catatan ?? ""} maxLength={300} placeholder="Catatan (boleh kosong)" className={`${kolomKecil} w-48`} />
                  </td>
                  <td className="px-4 py-3">
                    {bisaUbah && (
                      <form id={formId} action={simpanPemilih}>
                        <input type="hidden" name="id" value={r.id} />
                        <button className={tombol.kecil}>Simpan</button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
            {!tampil.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-base text-slate-500">Tidak ada nama yang cocok.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-base text-slate-700">
        <span>Halaman {halaman} dari {totalHal}</span>
        <span className="flex gap-3">
          {halaman > 1 && <Link href={qs({ hal: halaman - 1 })} className={tombol.sekunder}>← Sebelumnya</Link>}
          {halaman < totalHal && <Link href={qs({ hal: halaman + 1 })} className={tombol.sekunder}>Berikutnya →</Link>}
        </span>
      </div>

      <div className="flex justify-end">
        <Link href="/dashboard/pilkades/tps" className={tombol.utama}>Lanjut ke Langkah 3: Atur TPS →</Link>
      </div>
    </div>
  );
}
