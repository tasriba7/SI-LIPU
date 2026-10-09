"use client";

import { useLayoutEffect, useState } from "react";
import { formatTanggalId, namaKabupatenTanpaAwalan } from "@/lib/suratTemplate";

// Pratinjau + area cetak surat (A4). Dipakai oleh editor surat dan halaman
// "Surat Terbit" (cetak ulang dari snapshot), supaya tampilannya selalu sama.

function TabelBiodata({ daftar }) {
  if (!daftar?.length) return null;
  return (
    <table className="my-3 ml-8" style={{ borderCollapse: "collapse" }}>
      <tbody>
        {daftar.map((b, i) => (
          <tr key={i} style={{ verticalAlign: "top" }}>
            <td style={{ paddingRight: "8mm", whiteSpace: "nowrap" }}>{b.label}</td>
            <td style={{ paddingRight: "3mm" }}>:</td>
            <td>{b.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ---- Ukuran huruf kop -------------------------------------------------------
// Baris kabupaten & kecamatan memakai SATU ukuran yang sama (ukuran terbesar
// yang masih membuat keduanya muat satu baris). Baris desa lebih besar dan
// dihitung sendiri. Semua baris tidak pernah turun ke bawah.

const FONT_KOP = '"Times New Roman", Times, serif';
// Lebar teks kop yang tersedia (mm). Dengan logo: A4 dikurangi margin samping
// dan ruang logo kiri-kanan; sengaja sedikit konservatif.
const LEBAR_KOP_MM = { denganLogo: 120, tanpaLogo: 165 };
const UKURAN_MIN_PT = 8.5;

let kanvasUkur = null;

/** Lebar teks tebal dalam px CSS pada ukuran tertentu, diukur dengan font surat. */
function lebarPx(teks, ukuranPt) {
  if (!kanvasUkur) kanvasUkur = document.createElement("canvas").getContext("2d");
  kanvasUkur.font = `700 ${(ukuranPt * 96) / 72}px ${FONT_KOP}`;
  return kanvasUkur.measureText(teks).width;
}

/** Ukuran terbesar (maks. dasarPt) agar SEMUA teks muat dalam satu baris. */
function ukuranMuat(daftarTeks, dasarPt, lebarMm) {
  const batasPx = (lebarMm * 96) / 25.4;
  let ukuran = dasarPt;
  for (const teks of daftarTeks) {
    const lebar = lebarPx(teks, dasarPt);
    if (lebar > batasPx) ukuran = Math.min(ukuran, (dasarPt * batasPx) / lebar);
  }
  return Math.max(UKURAN_MIN_PT, Math.floor(ukuran * 10) / 10);
}

/** Perkiraan kasar berdasarkan jumlah huruf; dipakai sebelum pengukuran di browser. */
function ukuranPerkiraan(teks, dasarPt) {
  const batas = dasarPt >= 15 ? 30 : 34; // jumlah huruf yang masih muat pada ukuran dasar
  const n = String(teks).length;
  if (n <= batas) return dasarPt;
  return Math.max(UKURAN_MIN_PT, Math.floor(((dasarPt * batas) / n) * 10) / 10);
}

export default function SuratPratinjau({
  draf,
  nomor,
  petunjukNomor,
  tanggal,
  kota,
  ttd,
  config,
  gambar,
}) {
  const barisKabupaten = `PEMERINTAH KABUPATEN ${namaKabupatenTanpaAwalan(config.kabupaten).toUpperCase()}`.trim();
  const barisKecamatan = `KECAMATAN ${(config.kecamatan || "").toUpperCase()}`.trim();
  const barisDesa = `${config.jenis_wilayah === "Kelurahan" ? "KELURAHAN" : "DESA"} ${(config.nama_desa || "").toUpperCase()}`.trim();

  const [ukuran, setUkuran] = useState(() => ({
    kabKec: Math.min(ukuranPerkiraan(barisKabupaten, 13), ukuranPerkiraan(barisKecamatan, 13)),
    desa: ukuranPerkiraan(barisDesa, 15),
  }));

  // Setelah tampil di browser, ukur lebar teks sebenarnya supaya ukuran pas.
  useLayoutEffect(() => {
    const lebarMm = config.logo_url ? LEBAR_KOP_MM.denganLogo : LEBAR_KOP_MM.tanpaLogo;
    try {
      setUkuran({
        kabKec: ukuranMuat([barisKabupaten, barisKecamatan], 13, lebarMm),
        desa: ukuranMuat([barisDesa], 15, lebarMm),
      });
    } catch {
      // Canvas tidak tersedia: tetap pakai perkiraan awal.
    }
  }, [barisKabupaten, barisKecamatan, barisDesa, config.logo_url]);

  const ukuranKabKec = `${ukuran.kabKec.toFixed(1)}pt`;
  const ukuranDesa = `${ukuran.desa.toFixed(1)}pt`;

  return (
    <>
      <div
        id="area-cetak"
        className="mx-auto w-full max-w-[210mm] bg-white p-[18mm] shadow print:max-w-none print:p-0 print:shadow-none"
        style={{ fontFamily: FONT_KOP, fontSize: "12pt", color: "#000", lineHeight: 1.5 }}
      >
        {/*
          Saat dicetak, margin halaman (@page) = 0 supaya browser tidak mencetak
          tanggal, judul, alamat web, dan nomor halaman. Jarak atas & bawah
          dikembalikan oleh baris pengisi (thead/tfoot, berulang di tiap
          lembar), jarak samping oleh padding sel isi. Di layar semua itu
          tidak tampil; jaraknya dari padding area-cetak di atas.
        */}
        <table className="w-full" style={{ borderCollapse: "collapse" }}>
          <thead className="hidden print:table-header-group">
            <tr>
              <td style={{ height: "18mm", padding: 0 }} />
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-0 align-top print:px-[20mm]">
                {/* Kop surat: 4 baris, masing-masing SATU baris (tidak membungkus). */}
                <div className="relative border-b-[3px] border-double border-black pb-2">
                  {config.logo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={config.logo_url} alt="" style={{ position: "absolute", left: 0, top: 0, width: "22mm", height: "22mm", objectFit: "contain" }} />
                  )}
                  <div className="text-center" style={{ lineHeight: 1.25, padding: config.logo_url ? "0 24mm" : 0 }}>
                    <div style={{ fontSize: ukuranKabKec, fontWeight: 700, whiteSpace: "nowrap" }}>
                      {barisKabupaten}
                    </div>
                    <div style={{ fontSize: ukuranKabKec, fontWeight: 700, whiteSpace: "nowrap" }}>
                      {barisKecamatan}
                    </div>
                    <div style={{ fontSize: ukuranDesa, fontWeight: 700, whiteSpace: "nowrap" }}>
                      {barisDesa}
                    </div>
                    {config.alamat && (
                      <div style={{ fontSize: "9.5pt", fontStyle: "italic", whiteSpace: "nowrap" }}>{config.alamat}</div>
                    )}
                  </div>
                </div>

                {/* Judul & nomor */}
                <div className="mt-5 text-center">
                  {draf.judul_atas && (
                    <div style={{ fontStyle: "italic", fontSize: "11pt" }}>{draf.judul_atas}</div>
                  )}
                  <div style={{ fontWeight: 700, textDecoration: "underline" }}>{draf.judul}</div>
                  <div>
                    Nomor: {nomor || "........................"}
                    {/* Petunjuk hanya di layar editor, tidak ikut tercetak. */}
                    {petunjukNomor && <span className="print:hidden"> {petunjukNomor}</span>}
                  </div>
                </div>

                <p className="mt-5" style={{ textAlign: "justify" }}>{draf.pembuka}</p>

                <TabelBiodata daftar={draf.biodata} />

                {draf.teks_tengah && <p style={{ textAlign: "justify" }}>{draf.teks_tengah}</p>}
                <TabelBiodata daftar={draf.biodata2} />

                {(draf.isi || "").split(/\n{2,}/).filter(Boolean).map((p, i) => (
                  <p key={i} className="mb-2" style={{ textAlign: "justify", textIndent: "10mm" }}>{p}</p>
                ))}
                {draf.penutup && (
                  <p className="mt-2" style={{ textAlign: "justify", textIndent: "10mm" }}>{draf.penutup}</p>
                )}

                {/* Tanda tangan */}
                <div className="mt-8 ml-auto w-[75mm] text-center" style={{ breakInside: "avoid" }}>
                  <div>{kota || "........"}, {formatTanggalId(tanggal)}</div>
                  {ttd.jabatan_awal && <div>{ttd.jabatan_awal}</div>}
                  <div style={{ fontWeight: 700 }}>{ttd.jabatan}</div>
                  <div style={{ height: "22mm", position: "relative" }}>
                    {gambar?.stempel && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={gambar.stempel} alt="" style={{ position: "absolute", left: "-6mm", top: "-3mm", width: "26mm", opacity: 0.85, mixBlendMode: "multiply" }} />
                    )}
                    {gambar?.ttd && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={gambar.ttd} alt="" style={{ position: "absolute", left: "50%", top: 0, height: "22mm", transform: "translateX(-50%)", objectFit: "contain", mixBlendMode: "multiply" }} />
                    )}
                  </div>
                  <div style={{ fontWeight: 700, textDecoration: "underline" }}>{ttd.nama || "........................"}</div>
                  {ttd.nip && <div>NIP. {ttd.nip}</div>}
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot className="hidden print:table-footer-group">
            <tr>
              <td style={{ height: "18mm", padding: 0 }} />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* CSS cetak: hanya #area-cetak yang tampil, kertas A4, tanpa margin halaman. */}
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body * { visibility: hidden !important; }
          #area-cetak, #area-cetak * { visibility: visible !important; }
          #area-cetak { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </>
  );
}
