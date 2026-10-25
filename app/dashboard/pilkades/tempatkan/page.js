import TahapTerkunci from "@/components/pilkades/TahapTerkunci";
import { kunciHalaman } from "@/lib/pilkadesKunci";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ambilRole } from "@/lib/akses";
import { bisaUbahPilkades } from "@/lib/roles";
import { ambilPeriode, ambilDaftarPemilih, hitungUmur } from "@/lib/pilkades";
import { masukkanKeTps } from "../actions";
import PanduanLangkah from "@/components/pilkades/PanduanLangkah";
import TombolKonfirmasi from "@/components/pilkades/TombolKonfirmasi";
import TabelTempatkan from "./TabelTempatkan";
import { JudulHalaman, Kartu, KosongPandu, tombol, kolomKecil } from "@/components/pilkades/UI";
import PesanSekali from "@/components/pilkades/PesanSekali";
import { pesanDari, COBA_LAGI } from "@/lib/pilkadesPesan";

export const metadata = { title: "Tempatkan Pemilih ke TPS" };
const PER_HALAMAN = 50;

const PESAN_HASIL = {
  ok: (sp) => ["sukses", "Berhasil", `${sp.n} pemilih dimasukkan ke ${sp.tps}.`],
  kosong: ["perhatian", "Belum ada yang dipilih", "Centang nama pemilih dulu, atau tidak ada pemilih yang cocok."],
  tps: ["perhatian", "TPS belum dipilih", "Pilih TPS tujuan dulu."],
  gagal: ["bahaya", "Gagal menyimpan", COBA_LAGI],
};

export default async function TempatkanPage({ searchParams }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const periode = await ambilPeriode(supabase);
  const { role } = await ambilRole(supabase);
  const bisaUbah = bisaUbahPilkades(role);
  if (!periode) {
    return <KosongPandu judul="Belum ada periode Pilkades" href="/dashboard/pilkades/pengaturan/periode" label="Buka Periode Pilkades" />;
  }

  // Gerbang urutan kerja: tahap ini terkunci sampai pekerjaan sebelumnya selesai.
  const kunci = await kunciHalaman(supabase, periode, "/dashboard/pilkades/tempatkan");
  if (kunci) return <TahapTerkunci kunci={kunci} />;

  const [{ data: tps }, { data: semua }] = await Promise.all([
    supabase.from("pilkades_tps").select("id, nama").eq("periode_id", periode.id).order("nama"),
    ambilDaftarPemilih(supabase, periode.id),
  ]);

  if (!(tps ?? []).length) {
    return (
      <div className="mx-auto max-w-5xl space-y-5">
        <PanduanLangkah aktif="tempatkan" />
        <KosongPandu
          judul="Belum ada TPS"
          teks="Pemilih baru bisa ditempatkan setelah TPS dibuat. Tambah TPS pertama Anda dulu."
          href="/dashboard/pilkades/tps"
          label="Ke Langkah 3: Atur TPS"
        />
      </div>
    );
  }

  const layak = (semua ?? []).filter((r) => r.status_verifikasi === "memenuhi_syarat");
  if (!layak.length) {
    return (
      <div className="mx-auto max-w-5xl space-y-5">
        <PanduanLangkah aktif="tempatkan" />
        <KosongPandu
          judul="Belum ada pemilih yang memenuhi syarat"
          teks="Tandai dulu siapa yang berhak memilih, baru mereka bisa ditempatkan ke TPS."
          href="/dashboard/pilkades/pemilih"
          label="Ke Langkah 2: Periksa Pemilih"
        />
      </div>
    );
  }

  const namaTps = Object.fromEntries((tps ?? []).map((t) => [t.id, t.nama]));
  const acuan = periode.tanggal_pemungutan ? new Date(periode.tanggal_pemungutan) : new Date();
  const belumTps = layak.filter((r) => !r.tps_id);
  const dusunList = [...new Set(layak.map((r) => r.dusun).filter(Boolean))].sort();

  const cari = (sp.cari ?? "").toString().toLowerCase();
  const fDusun = sp.dusun ?? "";
  const fTampil = sp.tampil ?? "belum";
  const hasil = layak.filter(
    (r) =>
      (!cari || r.nama_lengkap.toLowerCase().includes(cari)) &&
      (!fDusun || r.dusun === fDusun) &&
      (fTampil === "semua" || !r.tps_id)
  );
  const halaman = Math.max(1, parseInt(sp.hal ?? "1", 10) || 1);
  const totalHal = Math.max(1, Math.ceil(hasil.length / PER_HALAMAN));
  const baris = hasil.slice((halaman - 1) * PER_HALAMAN, halaman * PER_HALAMAN).map((r) => ({
    id: r.id,
    nama: r.nama_lengkap,
    nik: r.nik_samar,
    umur: hitungUmur(r.tanggal_lahir, acuan),
    dusun: r.dusun,
    rtrw: r.rt || r.rw ? `RT ${r.rt ?? "-"} / RW ${r.rw ?? "-"}` : "RT/RW kosong",
    tpsNama: r.tps_id ? namaTps[r.tps_id] ?? "TPS" : null,
  }));

  const perTps = (tps ?? []).map((t) => ({ ...t, n: layak.filter((r) => r.tps_id === t.id).length }));
  const qs = (o) => {
    const p = new URLSearchParams({ cari: sp.cari ?? "", dusun: fDusun, tampil: fTampil, ...o });
    for (const [k, v] of [...p]) if (!v) p.delete(k);
    return `?${p.toString()}`;
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PanduanLangkah aktif="tempatkan" />
      <JudulHalaman
        langkah={4}
        judul="Tempatkan Pemilih ke TPS"
        penjelasan="Tentukan tiap pemilih mencoblos di TPS mana. Hanya warga yang berstatus “Memenuhi syarat” yang tampil di sini. Anda bisa memasukkan banyak orang sekaligus."
      />

      <PesanSekali pesan={pesanDari(PESAN_HASIL, sp)} bersihkan={["hasil", "n", "tps"]} />

      {/* Ringkasan per TPS */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {perTps.map((t) => (
          <div key={t.id} className="rounded-xl border border-sky-100 bg-white p-4">
            <p className="text-sm font-semibold text-slate-800">{t.nama}</p>
            <p className="text-2xl font-extrabold text-sky-700">{t.n}</p>
            <p className="text-sm text-slate-600">pemilih</p>
          </div>
        ))}
        <div className={`rounded-xl border p-4 ${belumTps.length ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50"}`}>
          <p className="text-sm font-semibold text-slate-800">Belum punya TPS</p>
          <p className={`text-2xl font-extrabold ${belumTps.length ? "text-amber-700" : "text-emerald-700"}`}>{belumTps.length}</p>
          <p className="text-sm text-slate-600">{belumTps.length ? "perlu ditempatkan" : "semua beres ✓"}</p>
        </div>
      </div>

      {/* Jalan pintas */}
      {bisaUbah && belumTps.length > 0 && (
        <Kartu className="border-sky-300 bg-sky-50">
          <h2 className="text-base font-bold text-sky-950">⚡ Cara tercepat: masukkan sekaligus</h2>
          <p className="mt-1 text-sm text-slate-700">
            Pilih TPS (dan dusun bila perlu), lalu semua pemilih yang <b>belum punya TPS</b> langsung dimasukkan. Anda bisa memindahkannya lagi nanti.
          </p>
          <form action={masukkanKeTps} className="mt-3 flex flex-wrap items-end gap-3">
            <input type="hidden" name="periode_id" value={periode.id} />
            <input type="hidden" name="mode" value="semua" />
            <label className="text-sm font-semibold text-slate-800">
              Dusun
              <select name="dusun" defaultValue="" className={`${kolomKecil} mt-1 block`}>
                <option value="">Semua dusun ({belumTps.length} orang)</option>
                {dusunList.map((d) => (
                  <option key={d} value={d}>{d} ({belumTps.filter((r) => r.dusun === d).length} orang)</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-slate-800">
              Masukkan ke
              <select name="tps_id" required defaultValue="" className={`${kolomKecil} mt-1 block`}>
                <option value="" disabled>Pilih TPS…</option>
                {tps.map((t) => <option key={t.id} value={t.id}>{t.nama}</option>)}
              </select>
            </label>
            <TombolKonfirmasi pesan="Masukkan semua pemilih yang belum punya TPS (sesuai pilihan dusun) ke TPS ini?" className={tombol.utama}>
              Masukkan Sekarang
            </TombolKonfirmasi>
          </form>
        </Kartu>
      )}

      {/* Pilih manual */}
      <Kartu>
        <h2 className="text-base font-bold text-sky-950">Atau pilih nama satu per satu</h2>
        <form className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex-1 basis-48 text-sm font-semibold text-slate-800">
            Cari nama
            <input name="cari" defaultValue={sp.cari ?? ""} placeholder="Ketik nama…" className={`${kolomKecil} mt-1 block w-full`} />
          </label>
          <label className="text-sm font-semibold text-slate-800">
            Dusun
            <select name="dusun" defaultValue={fDusun} className={`${kolomKecil} mt-1 block`}>
              <option value="">Semua dusun</option>
              {dusunList.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-800">
            Tampilkan
            <select name="tampil" defaultValue={fTampil} className={`${kolomKecil} mt-1 block`}>
              <option value="belum">Yang belum punya TPS</option>
              <option value="semua">Semua pemilih</option>
            </select>
          </label>
          <button className={tombol.sekunder}>Tampilkan</button>
        </form>
        <p className="mt-3 text-sm text-slate-700">Menampilkan <b>{hasil.length}</b> orang.</p>
      </Kartu>

      <TabelTempatkan key={`${halaman}-${fDusun}-${fTampil}-${cari}-${belumTps.length}`} baris={baris} tpsList={tps} periodeId={periode.id} bisaUbah={bisaUbah} />

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-700">
        <span>Halaman {halaman} dari {totalHal}</span>
        <span className="flex gap-3">
          {halaman > 1 && <Link href={qs({ hal: halaman - 1 })} className={tombol.sekunder}>← Sebelumnya</Link>}
          {halaman < totalHal && <Link href={qs({ hal: halaman + 1 })} className={tombol.sekunder}>Berikutnya →</Link>}
        </span>
      </div>

      {belumTps.length === 0 && (
        <div className="flex justify-end">
          <Link href="/dashboard/pilkades/daftar" className={tombol.utama}>Lanjut ke Langkah 5: Tetapkan DPS & DPT →</Link>
        </div>
      )}
    </div>
  );
}
