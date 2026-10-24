import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { jagaHalamanPilkades } from "@/lib/akses";
import { getConfigDesa } from "@/lib/configDesa";
import {
  ambilPeriode, ambilRekapSuara, ambilSusunanPanitia, susunPenandatangan, formatTanggal,
} from "@/lib/pilkades";
import BlokTtd from "@/components/pilkades/BlokTtd";
import TombolCetak from "../TombolCetak";

export const metadata = { title: "Berita Acara Hasil Pemilihan" };

// Tanggal "yyyy-mm-dd" ditampilkan apa adanya (tanpa geser zona waktu).
const hariTanggal = (t) =>
  t ? new Date(`${t}T00:00:00Z`).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "-";

export default async function CetakBeritaAcara() {
  const supabase = await createClient();
  await jagaHalamanPilkades(supabase);
  const periode = await ambilPeriode(supabase);
  if (!periode) redirect("/dashboard/pilkades");

  const [rekap, desa, susunan] = await Promise.all([
    ambilRekapSuara(supabase, periode.id),
    getConfigDesa(supabase),
    ambilSusunanPanitia(supabase, periode.id),
  ]);
  if (rekap.error || !rekap.calon.length) redirect("/dashboard/pilkades/hasil");
  const { calon, tps, total, hasil } = rekap;
  const resmi = !!hasil;
  const terpilih = hasil ? calon.find((c) => c.id === hasil.calon_id) : null;
  const penandatangan = susunPenandatangan("berita_acara_hasil", susunan);
  const sebutan = desa.jenis_wilayah ?? "Desa";
  const namaDesa = `${sebutan} ${desa.nama_desa ?? ""}`.trim();
  const tanggalAcuan = hasil?.tanggal_penetapan ?? periode.tanggal_pemungutan;

  await supabase.rpc("pilkades_catat", {
    p_periode: periode.id,
    p_aksi: "cetak_berita_acara",
    p_detail: resmi ? "Berita acara resmi" : "Pratinjau draf (calon terpilih belum ditetapkan)",
  });

  const cetakPada = new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Makassar" });
  const tempatTanggal = `${desa.nama_desa ?? ""}${desa.nama_desa ? ", " : ""}${formatTanggal(tanggalAcuan)}`;

  return (
    <>
      <style>{`
        @page { size: A4 portrait; margin: 15mm; }
        html, body { background: #fff; }
        .ba { position: relative; font-family: "Times New Roman", serif; color: #000; font-size: 11.5pt; line-height: 1.45; padding: 6mm 8mm; }
        .ba h1 { font-size: 13pt; text-align: center; margin: 0; font-weight: 700; }
        .ba .sub { text-align: center; margin: 0 0 4mm; }
        .ba p { margin: 0 0 2.5mm; text-align: justify; }
        .tbl { width: 100%; border-collapse: collapse; font-size: 10.5pt; margin: 2mm 0 4mm; }
        .tbl th, .tbl td { border: 0.3mm solid #000; padding: 0.8mm 1.6mm; text-align: center; }
        .tbl th { background: #e5e7eb; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .tbl td.kiri, .tbl th.kiri { text-align: left; }
        .tbl tr.jumlah td { font-weight: 700; }
        .ttd-grup { text-align: center; margin-top: 6mm; break-inside: avoid; }
        .ttd-tempat { margin-bottom: 0.5mm; }
        .ttd-judul { font-weight: 700; margin-bottom: 0.5mm; }
        .ttd-baris { display: flex; gap: 12mm; justify-content: center; }
        .ttd { text-align: center; min-width: 62mm; }
        .ttd .ruang { height: 20mm; }
        .ttd-nama { font-weight: 700; }
        .tanda-air { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none;
          font-size: 110pt; font-weight: 800; color: rgba(0,0,0,0.07); transform: rotate(-35deg); letter-spacing: 6mm; }
        .kaki { font-size: 8.5pt; margin-top: 4mm; }
        @media print { .no-print, button { display: none !important; } }
        @media screen { .ba { max-width: 210mm; margin: 12px auto; border: 1px solid #cbd5e1; background: #fff; } }
      `}</style>

      <TombolCetak
        petunjuk={<>Di dialog cetak: pilih kertas <b>A4</b>, orientasi <b>Potret</b>, skala <b>100%</b>, aktifkan <b>Grafik latar belakang</b>.</>}
      />

      <section className="ba">
        {!resmi && <div className="tanda-air">DRAF</div>}
        <h1>BERITA ACARA PENGHITUNGAN SUARA DAN PENETAPAN CALON KEPALA {sebutan.toUpperCase()} TERPILIH</h1>
        <p className="sub">
          {periode.nama.toUpperCase()} · {namaDesa.toUpperCase()}
          {hasil?.nomor_berita_acara && <><br />Nomor: {hasil.nomor_berita_acara}</>}
        </p>

        <p>
          Pada hari ini, {hariTanggal(tanggalAcuan)}, Panitia Pemilihan Kepala {sebutan} {desa.nama_desa ?? ""}
          {desa.kecamatan ? `, Kecamatan ${desa.kecamatan}` : ""}{desa.kabupaten ? `, ${desa.kabupaten}` : ""}, telah melaksanakan
          penghitungan suara pemilihan Kepala {sebutan} yang pemungutan suaranya dilaksanakan pada {hariTanggal(periode.tanggal_pemungutan)},
          dengan hasil sebagai berikut:
        </p>

        <table className="tbl">
          <thead>
            <tr>
              <th rowSpan={2} className="kiri">TPS</th>
              <th rowSpan={2}>Pemilih di DPT</th>
              <th rowSpan={2}>Pemilih hadir</th>
              <th colSpan={calon.length}>Suara sah per calon (nomor urut)</th>
              <th rowSpan={2}>Jumlah suara sah</th>
              <th rowSpan={2}>Suara tidak sah</th>
            </tr>
            <tr>{calon.map((c) => <th key={c.id}>{c.nomor_urut}</th>)}</tr>
          </thead>
          <tbody>
            {tps.map((t) => (
              <tr key={t.id}>
                <td className="kiri">{t.nama}</td>
                <td>{t.dpt}</td>
                <td>{t.hadir}</td>
                {calon.map((c) => <td key={c.id}>{t.diisi ? (t.suara[c.id] ?? 0) : "-"}</td>)}
                <td>{t.diisi ? t.sah : "-"}</td>
                <td>{t.diisi ? t.tidakSah : "-"}</td>
              </tr>
            ))}
            <tr className="jumlah">
              <td className="kiri">JUMLAH</td>
              <td>{total.dpt}</td>
              <td>{total.hadir}</td>
              {calon.map((c) => <td key={c.id}>{total.perCalon[c.id] ?? 0}</td>)}
              <td>{total.sah}</td>
              <td>{total.tidakSah}</td>
            </tr>
          </tbody>
        </table>

        <p>Calon Kepala {sebutan} yang ditetapkan dan nomor urutnya:</p>
        <table className="tbl">
          <thead><tr><th>No. urut</th><th className="kiri">Nama calon</th><th>Perolehan suara sah</th></tr></thead>
          <tbody>
            {calon.map((c) => (
              <tr key={c.id}>
                <td>{c.nomor_urut}</td>
                <td className="kiri">{c.nama}</td>
                <td>{total.perCalon[c.id] ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {resmi && terpilih ? (
          <p>
            Berdasarkan perolehan suara terbanyak, Panitia Pemilihan menetapkan <b>{terpilih.nama}</b> (calon nomor urut {terpilih.nomor_urut})
            sebagai Calon Kepala {sebutan} Terpilih dengan perolehan {hasil.suara_calon} dari {hasil.suara_sah_total} suara sah.
            {hasil.catatan ? ` Catatan: ${hasil.catatan}.` : ""}
          </p>
        ) : (
          <p><i>Calon terpilih belum ditetapkan. Dokumen ini masih berupa draf.</i></p>
        )}
        <p>Demikian berita acara ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.</p>

        <BlokTtd judulPanitia={`Panitia Pemilihan Kepala ${sebutan}`} tempatTanggal={tempatTanggal} penandatangan={penandatangan} />

        <p className="kaki">Dicetak {cetakPada}{resmi ? "" : " · DRAF"}</p>
      </section>
    </>
  );
}
