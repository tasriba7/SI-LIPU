import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  ambilPeriode, ambilDaftarPemilih, ambilSusunanPanitia, susunPenandatangan,
  formatTanggal, STATUS_VERIFIKASI, JENIS_DAFTAR_LABEL,
} from "@/lib/pilkades";
import PanduanLangkah from "@/components/pilkades/PanduanLangkah";
import { JudulHalaman, Pesan, Kartu, KosongPandu, tombol, kolom, labelKolom } from "@/components/pilkades/UI";

export const metadata = { title: "Cetak Daftar Pemilih" };

export default async function PilihanCetak() {
  const supabase = await createClient();
  const periode = await ambilPeriode(supabase);
  if (!periode) {
    return <KosongPandu judul="Belum ada periode Pilkades" href="/dashboard/pilkades/periode" label="Buka Periode Pilkades" />;
  }

  const [{ data: tps }, { data: pemilih }, { data: arsip }] = await Promise.all([
    supabase.from("pilkades_tps").select("id, nama").eq("periode_id", periode.id).order("nama"),
    ambilDaftarPemilih(supabase, periode.id),
    supabase
      .from("pilkades_daftar_tetap")
      .select("id, jenis, versi, tanggal_penetapan")
      .eq("periode_id", periode.id)
      .order("created_at", { ascending: false }),
  ]);
  const dusunList = [...new Set((pemilih ?? []).map((r) => r.dusun).filter(Boolean))].sort();
  const adaArsip = (arsip ?? []).length > 0;
  const susunan = await ambilSusunanPanitia(supabase, periode.id);
  const ttdKosong = susunPenandatangan("daftar_pemilih", susunan).filter((p) => !p.nama);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PanduanLangkah aktif="cetak" />
      <JudulHalaman
        langkah={6}
        judul="Cetak Daftar"
        penjelasan="Pilih daftar yang ingin dicetak, lalu klik tombol di bawah. Layar pratinjau akan terbuka di tab baru sebelum dicetak."
      />

      <Pesan jenis="info" judul="Bedanya draf dan daftar resmi">
        Cetakan dari <b>“Draf terkini”</b> diberi tanda air DRAF. Cetakan dari <b>DPS atau DPT</b> yang sudah ditetapkan adalah daftar resmi.
        {!adaArsip && " Saat ini belum ada DPS/DPT yang ditetapkan, jadi hanya draf yang bisa dicetak."}
      </Pesan>

      {ttdKosong.length > 0 && (
        <Pesan jenis="perhatian" judul="Kolom tanda tangan belum berisi nama">
          Nama {ttdKosong.map((p) => p.label).join(" dan ")} belum diisi, jadi kolomnya dicetak kosong.{" "}
          <Link href="/dashboard/pilkades/panitia" className="font-bold underline">Isi Susunan Panitia →</Link>
        </Pesan>
      )}

      <Kartu>
        <form action="/cetak/pilkades" target="_blank" className="space-y-5">
          <label className={labelKolom}>
            Daftar mana yang dicetak?
            <select name="daftar" className={`${kolom} mt-1 font-normal`} defaultValue={arsip?.[0]?.id ?? ""}>
              <option value="">Draf terkini (data yang sedang dikerjakan)</option>
              {(arsip ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {JENIS_DAFTAR_LABEL[a.jenis]} versi {a.versi} (ditetapkan {formatTanggal(a.tanggal_penetapan)})
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className={labelKolom}>
              Untuk TPS mana?
              <select name="tps" className={`${kolom} mt-1 font-normal`} defaultValue="">
                <option value="">Semua TPS</option>
                <option value="none">Yang belum punya TPS</option>
                {(tps ?? []).map((t) => <option key={t.id} value={t.id}>{t.nama}</option>)}
              </select>
            </label>
            <label className={labelKolom}>
              Untuk dusun mana?
              <select name="dusun" className={`${kolom} mt-1 font-normal`} defaultValue="">
                <option value="">Semua dusun</option>
                {dusunList.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
          </div>
          <label className={labelKolom}>
            Status pemilih <span className="font-normal text-slate-600">(hanya untuk draf; daftar resmi selalu berisi yang memenuhi syarat)</span>
            <select name="status" className={`${kolom} mt-1 font-normal`} defaultValue="memenuhi_syarat">
              {Object.entries(STATUS_VERIFIKASI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              <option value="semua">Semua status</option>
            </select>
          </label>
          <label className="flex items-start gap-3 rounded-xl bg-sky-50 p-4 text-base text-slate-900">
            <input type="checkbox" name="nik" value="1" className="mt-1 h-5 w-5" />
            <span>
              <b>Sertakan kolom NIK</b> (sebagian angka disamarkan)
              <span className="block text-sm text-slate-600">Untuk papan pengumuman umum, biarkan tidak dicentang agar data warga aman.</span>
            </span>
          </label>
          <button className={`${tombol.utama} text-lg`}>Buka Pratinjau Cetak</button>
        </form>
      </Kartu>

      <Pesan jenis="info" judul="Berikutnya: Surat Undangan Memilih">
        Setelah daftar ditempel, cetak surat undangan untuk tiap pemilih di DPT.{" "}
        <Link href="/dashboard/pilkades/undangan" className="font-bold underline">Buka Surat Undangan →</Link>
      </Pesan>

      <p className="text-sm text-slate-600">Info kertas: F4 lanskap (330 × 215 mm), dua kolom berdampingan, margin 6 mm.</p>
    </div>
  );
}
