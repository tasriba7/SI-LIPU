import TahapTerkunci from "@/components/pilkades/TahapTerkunci";
import { kunciHalaman } from "@/lib/pilkadesKunci";
import { createClient } from "@/lib/supabase/server";
import { ambilPeriode, ambilDptTerbaru, ambilLogoPanitia, ambilSusunanPanitia, formatTanggal } from "@/lib/pilkades";
import Link from "next/link";
import { JudulHalaman, Catatan, Kartu, KosongPandu, tombol, kolom, labelKolom } from "@/components/pilkades/UI";

export const metadata = { title: "Surat Undangan Memilih — Pilkades" };

export default async function UndanganPage() {
  const supabase = await createClient();
  const periode = await ambilPeriode(supabase);
  if (!periode) {
    return <KosongPandu judul="Belum ada periode Pilkades" href="/dashboard/pilkades/pengaturan/periode" label="Buka Periode Pilkades" />;
  }

  // Gerbang urutan kerja: tahap ini terkunci sampai pekerjaan sebelumnya selesai.
  const kunci = await kunciHalaman(supabase, periode, "/dashboard/pilkades/undangan");
  if (kunci) return <TahapTerkunci kunci={kunci} />;
  const dpt = await ambilDptTerbaru(supabase, periode.id);
  if (!dpt.head) {
    return (
      <div className="mx-auto max-w-5xl">
        <KosongPandu
          judul="DPT belum ditetapkan"
          teks="Surat undangan dicetak dari DPT resmi, supaya nama dan nomor urutnya sama dengan daftar yang ditempel. Tetapkan DPS dan DPT dulu."
          href="/dashboard/pilkades/daftar"
          label="Ke Langkah 5: Tetapkan DPS & DPT"
        />
      </div>
    );
  }

  const [{ data: tpsList }, logo, susunan] = await Promise.all([
    supabase.from("pilkades_tps").select("id, nama, lokasi").eq("periode_id", periode.id).order("nama"),
    ambilLogoPanitia(supabase, periode.id),
    ambilSusunanPanitia(supabase, periode.id),
  ]);
  const dusunList = [...new Set(dpt.isi.map((r) => r.dusun).filter(Boolean))].sort();

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <JudulHalaman
        judul="Surat Undangan Memilih"
        penjelasan={`Surat pemberitahuan kepada pemilih untuk datang ke TPS. Isinya diambil dari DPT versi ${dpt.head.versi} (${dpt.head.jumlah ?? dpt.isi.length} pemilih): nama, nomor urut, dan TPS-nya. Dicetak 2 surat per lembar kertas, dengan bagian tanda terima yang digunting.`}
      />
      <Catatan
        judul="Sebelum mencetak"
        butir={[
          !logo && {
            jenis: "perhatian",
            judul: "Logo panitia belum diunggah",
            isi: (<>Surat dicetak tanpa logo. <Link href="/dashboard/pilkades/pengaturan/logo" className="font-bold underline">Unggah logo →</Link></>),
          },
          !susunan.ketua && {
            jenis: "perhatian",
            judul: "Nama Ketua belum diisi",
            isi: (<>Kolom tanda tangan dicetak kosong. <Link href="/dashboard/pilkades/pengaturan/panitia" className="font-bold underline">Isi Susunan Panitia →</Link></>),
          },
          !periode.tanggal_pemungutan && {
            jenis: "perhatian",
            judul: "Tanggal pemungutan belum diisi",
            isi: "Hari/tanggal dicetak berupa titik-titik untuk ditulis tangan.",
          },
        ]}
      />

      <Kartu>
        <form action="/cetak/pilkades/undangan" target="_blank" className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className={labelKolom}>
              Untuk TPS mana?
              <select name="tps" defaultValue="" className={`${kolom} mt-1 font-normal`}>
                <option value="">Semua TPS</option>
                {(tpsList ?? []).map((t) => <option key={t.id} value={t.nama}>{t.nama}</option>)}
              </select>
            </label>
            <label className={labelKolom}>
              Untuk dusun mana?
              <select name="dusun" defaultValue="" className={`${kolom} mt-1 font-normal`}>
                <option value="">Semua dusun</option>
                {dusunList.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <label className={labelKolom}>
              Jenis kertas
              <select name="kertas" defaultValue="f4" className={`${kolom} mt-1 font-normal`}>
                <option value="f4">F4 / Folio (215 × 330 mm)</option>
                <option value="a4">A4 (210 × 297 mm)</option>
              </select>
            </label>
            <label className={labelKolom}>
              Pukul
              <input name="pukul" defaultValue="07.00 s/d 14.00 WITA" maxLength={40} className={`${kolom} mt-1 font-normal`} />
            </label>
          </div>
          <label className={labelKolom}>
            Tambah surat kosong <span className="font-normal text-slate-600">(untuk pemilih DPTb/DPK, diisi tulis tangan; boleh 0)</span>
            <input type="number" name="kosong" min="0" max="200" defaultValue="0" className={`${kolom} mt-1 w-40 font-normal`} />
          </label>
          <p className="text-sm text-slate-600">
            Tanggal pemungutan: <b>{formatTanggal(periode.tanggal_pemungutan)}</b> (dari data periode). NIK dicetak sebagian disamarkan.
          </p>
          <button className={`${tombol.utama} text-base`}>Buka Pratinjau Cetak</button>
        </form>
      </Kartu>
    </div>
  );
}
