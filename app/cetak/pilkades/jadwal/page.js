import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { jagaHalamanPilkades } from "@/lib/akses";
import { getConfigDesa } from "@/lib/configDesa";
import { ambilPeriode, ambilSusunanPanitia, susunPenandatangan, ambilLogoPanitia, formatTanggal } from "@/lib/pilkades";
import { ambilJadwalLengkap } from "@/lib/pilkadesJadwal";
import BlokTtd from "@/components/pilkades/BlokTtd";
import TombolCetak from "../TombolCetak";

export const metadata = { title: "Cetak Jadwal Tahapan Pilkades" };

const MARGIN = 8; // mm, sengaja kecil

const LABEL_STATUS = {
  selesai: "Selesai",
  berlangsung: "Berlangsung",
  akan: "Akan datang",
  terlewat: "Terlewat",
  kosong: "Belum dijadwalkan",
};

export default async function CetakJadwal({ searchParams }) {
  const sp = await searchParams;
  const supabase = await createClient();
  await jagaHalamanPilkades(supabase);
  const periode = await ambilPeriode(supabase);
  if (!periode) redirect("/dashboard/pilkades");

  const [j, desa, susunan, logo] = await Promise.all([
    ambilJadwalLengkap(supabase, periode),
    getConfigDesa(supabase),
    ambilSusunanPanitia(supabase, periode.id),
    ambilLogoPanitia(supabase, periode.id),
  ]);
  if (j.error || !j.tahap.length) redirect("/dashboard/pilkades/pengaturan/jadwal");

  const denganStatus = sp.status === "1";
  await supabase.rpc("pilkades_catat", {
    p_periode: periode.id,
    p_aksi: "cetak_jadwal",
    p_detail: `${j.tahap.length} tahapan${denganStatus ? " · dengan kolom status" : ""}`,
  });

  const sebutan = desa.jenis_wilayah ?? "Desa";
  const namaDesa = `${sebutan} ${desa.nama_desa ?? ""}`.trim();
  const penandatangan = susunPenandatangan("jadwal_tahapan", susunan);
  const tempatTanggal = `${desa.nama_desa ?? ""}${desa.nama_desa ? ", " : ""}${formatTanggal(j.hariIni)}`;
  const cetakPada = new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Makassar" });
  const lebarKolom = denganStatus ? { no: "6%", nama: "36%", waktu: "22%", ket: "22%", status: "14%" } : { no: "6%", nama: "40%", waktu: "24%", ket: "30%" };

  return (
    <>
      <style>{`
        @page { size: A4 portrait; margin: ${MARGIN}mm; }
        html, body { background: #fff; }
        .jd { position: relative; font-family: Arial, sans-serif; color: #000; font-size: 10.5pt; line-height: 1.35; }
        .kop { position: relative; text-align: center; min-height: 16mm; margin-bottom: 4mm; }
        .kop .logo-kop { position: absolute; left: 0; top: 0; height: 16mm; max-width: 24mm; object-fit: contain; }
        .kop h1 { font-size: 13pt; margin: 0; font-weight: 700; }
        .kop p { font-size: 10pt; margin: 0.5mm 0 0; }
        .tbl { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .tbl th, .tbl td { border: 0.35mm solid #000; padding: 1.2mm 1.8mm; vertical-align: top; }
        .tbl th { background: #e5e7eb; text-align: center; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .tbl tr { break-inside: avoid; page-break-inside: avoid; }
        .tbl td.c { text-align: center; }
        .arti { font-size: 8.5pt; color: #333; margin-top: 0.4mm; }
        .ttd-grup { text-align: center; margin: 6mm 0 0 auto; width: 70mm; break-inside: avoid; }
        .ttd-tempat { margin-bottom: 0.5mm; }
        .ttd-judul { font-weight: 700; margin-bottom: 0.5mm; }
        .ttd-baris { display: flex; justify-content: center; }
        .ttd { text-align: center; min-width: 62mm; }
        .ttd .ruang { height: 16mm; }
        .ttd-nama { font-weight: 700; }
        .kaki { font-size: 8.5pt; margin-top: 4mm; }
        @media print { .no-print, button { display: none !important; } }
        @media screen { .jd { max-width: 210mm; margin: 12px auto; padding: ${MARGIN}mm; border: 1px solid #cbd5e1; background: #fff; box-sizing: border-box; } }
      `}</style>

      <TombolCetak
        petunjuk={<>Di dialog cetak: pilih kertas <b>A4</b>, orientasi <b>Potret</b>, margin <b>Default</b> (dokumen sudah mengatur margin {MARGIN} mm), skala <b>100%</b>.</>}
      />

      <section className="jd">
        <div className="kop">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logo && <img src={logo.url} alt="" className="logo-kop" />}
          <div style={{ padding: logo ? "0 26mm" : 0 }}>
            <h1>JADWAL TAHAPAN PEMILIHAN KEPALA {sebutan.toUpperCase()}</h1>
            <p>{periode.nama.toUpperCase()} · {namaDesa.toUpperCase()}</p>
            <p>Pemungutan suara: {formatTanggal(periode.tanggal_pemungutan)}</p>
          </div>
        </div>

        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: lebarKolom.no }}>No</th>
              <th style={{ width: lebarKolom.nama }}>Tahapan</th>
              <th style={{ width: lebarKolom.waktu }}>Waktu</th>
              <th style={{ width: lebarKolom.ket }}>Keterangan</th>
              {denganStatus && <th style={{ width: lebarKolom.status }}>Status</th>}
            </tr>
          </thead>
          <tbody>
            {j.tahap.map((t) => (
              <tr key={t.key}>
                <td className="c">{t.no}</td>
                <td>
                  <b>{t.nama}</b>
                  {t.arti && <div className="arti">{t.arti}</div>}
                </td>
                <td>{t.rentang || "Belum ditentukan"}</td>
                <td>{t.catatan}</td>
                {denganStatus && <td className="c">{LABEL_STATUS[t.s]}</td>}
              </tr>
            ))}
          </tbody>
        </table>

        <BlokTtd
          judulPanitia={`Panitia Pemilihan Kepala ${sebutan}`}
          tempatTanggal={tempatTanggal}
          penandatangan={penandatangan}
        />

        <div className="kaki">Dicetak {cetakPada}{denganStatus ? ` · Status per ${formatTanggal(j.hariIni)}` : ""}</div>
      </section>
    </>
  );
}
