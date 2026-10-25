import TahapTerkunci from "@/components/pilkades/TahapTerkunci";
import { kunciHalaman } from "@/lib/pilkadesKunci";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ambilPeriode, ambilDptTerbaru, formatTanggal } from "@/lib/pilkades";
import { JudulHalaman, Catatan, Kartu, KosongPandu, tombol, kolomKecil } from "@/components/pilkades/UI";
import { teknis } from "@/lib/pilkadesPesan";
import { ambilRole } from "@/lib/akses";

export const metadata = { title: "Cetak Daftar Hadir — Pilkades" };

// Daftar hadir adalah DOKUMEN CETAK: pemilih menandatangani di TPS. Aplikasi tidak mencatat
// siapa yang hadir. Panitia hanya memasukkan JUMLAH hadir per TPS di tab Hasil Suara.
export default async function HadirPage() {
  const supabase = await createClient();
  const periode = await ambilPeriode(supabase);
  const { role } = await ambilRole(supabase);
  if (!periode) {
    return <KosongPandu judul="Belum ada periode Pilkades" href="/dashboard/pilkades/pengaturan/periode" label="Buka Periode Pilkades" />;
  }

  // Gerbang urutan kerja: tahap ini terkunci sampai pekerjaan sebelumnya selesai.
  const kunci = await kunciHalaman(supabase, periode, "/dashboard/pilkades/hari-h/hadir");
  if (kunci) return <TahapTerkunci kunci={kunci} />;

  const dpt = await ambilDptTerbaru(supabase, periode.id);
  if (!dpt.head) {
    return (
      <div className="mx-auto max-w-5xl">
        <KosongPandu
          judul="DPT belum ditetapkan"
          teks="Daftar hadir mengacu ke DPT resmi, bukan ke data yang masih bisa berubah. Tetapkan DPS dan DPT dulu."
          href="/dashboard/pilkades/daftar"
          label="Ke Langkah 5: Tetapkan DPS & DPT"
        />
      </div>
    );
  }

  const isi = dpt.isi;
  const rekap = new Map();
  for (const r of isi) {
    const k = r.tps_nama ?? "Tanpa TPS";
    const e = rekap.get(k) ?? { tps: k, dpt: 0, tambahan: 0 };
    if (r.tambahan) e.tambahan += 1;
    else e.dpt += 1;
    rekap.set(k, e);
  }
  const rekapList = [...rekap.values()].sort((a, b) => a.tps.localeCompare(b.tps, "id"));
  const totalDpt = rekapList.reduce((n, e) => n + e.dpt, 0);
  const totalTambahan = rekapList.reduce((n, e) => n + e.tambahan, 0);
  const dusunList = [...new Set(isi.map((r) => r.dusun).filter(Boolean))].sort((a, b) => a.localeCompare(b, "id"));

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <JudulHalaman
        judul={`Cetak Daftar Hadir — ${periode.nama}`}
        penjelasan={`Daftar hadir dicetak dan ditandatangani pemilih di TPS pada hari pemungutan suara (${formatTanggal(periode.tanggal_pemungutan)}). Aplikasi tidak mencatat siapa yang hadir. Isinya mengikuti DPT versi ${dpt.head.versi} (ditetapkan ${formatTanggal(dpt.head.tanggal_penetapan)}) ditambah Pemilih Tambahan.`}
      />

      <Catatan
        butir={[
          dpt.error && { jenis: "bahaya", judul: "Data gagal dimuat", isi: `Muat ulang halaman ini.${teknis(role, "0054", "0066")}` },
        ]}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {[
          ["Pemilih di DPT", totalDpt, "border-sky-200 bg-sky-50 text-sky-800"],
          ["Pemilih Tambahan", totalTambahan, "border-amber-200 bg-amber-50 text-amber-800"],
          ["Total di daftar hadir", totalDpt + totalTambahan, "border-slate-200 bg-slate-50 text-slate-800"],
        ].map(([label, n, gaya]) => (
          <div key={label} className={`rounded-xl border p-4 ${gaya}`}>
            <p className="text-sm font-semibold text-slate-800">{label}</p>
            <p className="mt-1 text-2xl font-extrabold">{n}</p>
          </div>
        ))}
      </div>

      <Kartu>
        <h2 className="text-base font-bold text-sky-950">Rangkuman per TPS</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-sm font-bold text-sky-900">
              <tr>
                <th className="py-2 pr-4">TPS</th>
                <th className="py-2 pr-4">Pemilih di DPT</th>
                <th className="py-2 pr-4">Pemilih Tambahan</th>
                <th className="py-2 pr-4">Total</th>
                <th className="py-2"><span className="sr-only">Cetak</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rekapList.map((e) => (
                <tr key={e.tps}>
                  <td className="py-2 pr-4 font-semibold text-slate-900">{e.tps}</td>
                  <td className="py-2 pr-4">{e.dpt}</td>
                  <td className="py-2 pr-4">{e.tambahan}</td>
                  <td className="py-2 pr-4 font-semibold">{e.dpt + e.tambahan}</td>
                  <td className="py-2 text-right">
                    <Link href={`/cetak/pilkades/hadir?tps=${encodeURIComponent(e.tps)}`} target="_blank" className="text-sm font-bold text-sky-800 underline">
                      Cetak TPS ini
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Kartu>

      <Kartu>
        <h2 className="text-base font-bold text-sky-950">Cetak daftar hadir (untuk tanda tangan pemilih)</h2>
        <p className="mt-1 text-sm text-slate-700">
          Setiap baris nama setinggi 1 cm dan margin kecil, jadi satu lembar memuat banyak nama dengan kolom tanda tangan yang lega. Halaman terakhir memuat rangkuman angka per TPS dengan kolom kosong untuk jumlah hadir yang diisi petugas.
        </p>
        <form action="/cetak/pilkades/hadir" target="_blank" className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm font-semibold text-slate-800">
            TPS
            <select name="tps" defaultValue="" className={`${kolomKecil} mt-1 block w-full`}>
              <option value="">Semua TPS</option>
              {rekapList.map((e) => <option key={e.tps} value={e.tps}>{e.tps}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-800">
            Dusun
            <select name="dusun" defaultValue="" className={`${kolomKecil} mt-1 block w-full`}>
              <option value="">Semua dusun</option>
              {dusunList.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-800">
            Tata letak
            <select name="tata" defaultValue="2kolom" className={`${kolomKecil} mt-1 block w-full`}>
              <option value="2kolom">2 kolom lanskap (paling banyak nama)</option>
              <option value="1kolom">1 kolom potret</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-800">
            Kertas
            <select name="kertas" defaultValue="f4" className={`${kolomKecil} mt-1 block w-full`}>
              <option value="f4">F4 / Folio</option>
              <option value="a4">A4</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-800">
            Baris kosong tambahan <span className="font-normal text-slate-600">(cadangan, ditulis tangan)</span>
            <input type="number" name="tambahan" min="0" max="100" defaultValue="0" className={`${kolomKecil} mt-1 block w-full`} />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 sm:pt-6">
            <input type="checkbox" name="nik" value="1" className="h-5 w-5" />
            Sertakan NIK (sebagian angka disamarkan)
          </label>
          <div className="sm:col-span-2 lg:col-span-3">
            <button className={tombol.sekunder}>Buka Pratinjau Cetak</button>
          </div>
        </form>
      </Kartu>

      <Kartu>
        <h2 className="text-base font-bold text-sky-950">Setelah pemungutan suara</h2>
        <p className="mt-1 text-sm text-slate-700">
          Hitung jumlah tanda tangan di daftar hadir tiap TPS, lalu masukkan angkanya bersama hasil hitung suara di tab berikutnya. Pilihan pemilih tidak direkam sama sekali, sehingga pemungutan suara tetap rahasia.
        </p>
        <div className="mt-3">
          <Link href="/dashboard/pilkades/hari-h/hasil" className={tombol.utama}>Ke Hasil Suara & Berita Acara</Link>
        </div>
      </Kartu>
    </div>
  );
}
