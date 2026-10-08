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

export default function SuratPratinjau({ draf, nomor, tanggal, kota, ttd, config }) {
  return (
    <>
      <div
        id="area-cetak"
        className="mx-auto w-full max-w-[210mm] bg-white p-[18mm] shadow print:max-w-none print:p-0 print:shadow-none"
        style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: "12pt", color: "#000", lineHeight: 1.5 }}
      >
        {/* Kop surat */}
        <div className="flex items-center gap-4 border-b-[3px] border-double border-black pb-2">
          {config.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.logo_url} alt="" style={{ width: "22mm", height: "22mm", objectFit: "contain" }} />
          )}
          <div className="flex-1 text-center" style={{ lineHeight: 1.25 }}>
            <div style={{ fontSize: "13pt", fontWeight: 700 }}>
              PEMERINTAH KABUPATEN {(config.kabupaten || "").toUpperCase()}
            </div>
            <div style={{ fontSize: "13pt", fontWeight: 700 }}>
              KECAMATAN {(config.kecamatan || "").toUpperCase()}
            </div>
            <div style={{ fontSize: "15pt", fontWeight: 700 }}>
              {config.jenis_wilayah === "Kelurahan" ? "KELURAHAN" : "DESA"} {(config.nama_desa || "").toUpperCase()}
            </div>
            {config.alamat && (
              <div style={{ fontSize: "9.5pt", fontStyle: "italic" }}>{config.alamat}</div>
            )}
          </div>
          {config.logo_url && <div style={{ width: "22mm" }} />}
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
          <div style={{ height: "22mm" }} />
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
