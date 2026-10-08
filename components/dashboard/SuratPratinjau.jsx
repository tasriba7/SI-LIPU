"use client";

import { formatTanggalId } from "@/lib/suratTemplate";

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

// Perkecil huruf kop bila teksnya panjang, supaya tetap satu baris di kertas A4.
function ukuranKop(teks, dasarPt) {
  const batas = dasarPt >= 15 ? 30 : 34; // jumlah huruf yang masih muat pada ukuran dasar
  const n = String(teks).length;
  if (n <= batas) return `${dasarPt}pt`;
  return `${Math.max(8.5, (dasarPt * batas) / n).toFixed(1)}pt`;
}

export default function SuratPratinjau({ draf, nomor, tanggal, kota, ttd, config, gambar }) {
  const barisKabupaten = `PEMERINTAH KABUPATEN ${(config.kabupaten || "").toUpperCase()}`.trim();
  const barisKecamatan = `KECAMATAN ${(config.kecamatan || "").toUpperCase()}`.trim();
  const barisDesa = `${config.jenis_wilayah === "Kelurahan" ? "KELURAHAN" : "DESA"} ${(config.nama_desa || "").toUpperCase()}`.trim();
  return (
    <>
      <div
        id="area-cetak"
        className="mx-auto w-full max-w-[210mm] bg-white p-[18mm] shadow print:max-w-none print:p-0 print:shadow-none"
        style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: "12pt", color: "#000", lineHeight: 1.5 }}
      >
        {/* Kop surat: 4 baris, masing-masing SATU baris (tidak membungkus). */}
        <div className="relative border-b-[3px] border-double border-black pb-2">
          {config.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.logo_url} alt="" style={{ position: "absolute", left: 0, top: 0, width: "22mm", height: "22mm", objectFit: "contain" }} />
          )}
          <div className="text-center" style={{ lineHeight: 1.25, padding: config.logo_url ? "0 24mm" : 0 }}>
            <div style={{ fontSize: ukuranKop(barisKabupaten, 13), fontWeight: 700, whiteSpace: "nowrap" }}>
              {barisKabupaten}
            </div>
            <div style={{ fontSize: ukuranKop(barisKecamatan, 13), fontWeight: 700, whiteSpace: "nowrap" }}>
              {barisKecamatan}
            </div>
            <div style={{ fontSize: ukuranKop(barisDesa, 15), fontWeight: 700, whiteSpace: "nowrap" }}>
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
          <div>Nomor: {nomor || "........................"}</div>
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
      </div>

      {/* CSS cetak: hanya #area-cetak yang tampil, kertas A4. */}
      <style>{`
        @media print {
          @page { size: A4; margin: 18mm 20mm; }
          body * { visibility: hidden !important; }
          #area-cetak, #area-cetak * { visibility: visible !important; }
          #area-cetak { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </>
  );
}
