"use client";

import { useMemo, useState, useTransition } from "react";
import {
  buatDraf,
  buatPenandatangan,
  formatTanggalId,
  hariIniISO,
} from "@/lib/suratTemplate";
import { terbitkanSurat } from "./actions";

const input =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-navy focus:outline-none";
const kosong = "border-amber-400 bg-amber-50";

function Label({ children }) {
  return <label className="mb-1 block text-xs font-medium text-slate-500">{children}</label>;
}

export default function SuratEditor({
  pengajuanId,
  templates,
  templateAwalId,
  vars,
  suratTerbit,
  config,
  bolehTerbitkan,
  wargaTerhubung,
}) {
  const [templateId, setTemplateId] = useState(templateAwalId || "");
  const template = useMemo(
    () => templates.find((t) => t.id === templateId) || null,
    [templates, templateId]
  );

  const tersimpan = suratTerbit?.isi || null;
  const [draf, setDraf] = useState(() => {
    if (tersimpan) return tersimpan;
    const t = templates.find((x) => x.id === templateAwalId);
    return t ? buatDraf(t, vars) : null;
  });

  const [nomor, setNomor] = useState(suratTerbit?.nomor_surat || "");
  const [tanggal, setTanggal] = useState(suratTerbit?.tanggal_surat || hariIniISO());
  const [kota, setKota] = useState(tersimpan?.kota || config.nama_desa || "");
  const [modeTtd, setModeTtd] = useState(tersimpan?.penandatangan?.mode || "kades");
  const [namaSekdes, setNamaSekdes] = useState(
    tersimpan?.penandatangan?.mode === "sekdes" ? tersimpan.penandatangan.nama : ""
  );
  const [nip, setNip] = useState(tersimpan?.penandatangan?.nip || "");
  const [pesan, setPesan] = useState(null);
  const [pending, mulai] = useTransition();

  const ttd = buatPenandatangan({
    mode: modeTtd,
    namaKades: config.kepala_desa_nama,
    namaSekdes,
    nip,
  });

  function gantiTemplate(id) {
    if (draf && !confirm("Mengganti jenis surat akan menimpa isi yang sudah Anda edit. Lanjutkan?"))
      return;
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    setDraf(t ? buatDraf(t, vars) : null);
  }

  function ubah(bagian, nilai) {
    setDraf((d) => ({ ...d, [bagian]: nilai }));
  }
  function ubahBio(i, nilai) {
    setDraf((d) => ({
      ...d,
      biodata: d.biodata.map((b, idx) => (idx === i ? { ...b, value: nilai } : b)),
    }));
  }

  function simpan() {
    setPesan(null);
    mulai(async () => {
      const r = await terbitkanSurat({
        pengajuanId,
        templateId: templateId || null,
        nomorSurat: nomor,
        tanggalSurat: tanggal,
        kota,
        draf,
        penandatangan: ttd,
      });
      setPesan(
        r?.error
          ? { jenis: "error", teks: r.error }
          : { jenis: "ok", teks: "Surat tersimpan & pengajuan ditandai selesai. Sekarang bisa dicetak." }
      );
    });
  }

  const adaKosong = !!draf && draf.biodata.some((b) => !b.value.trim());

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
      {/* ====== Panel isian (tidak ikut tercetak) ====== */}
      <div className="space-y-4 print:hidden">
        {!wargaTerhubung && (
          <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
            NIK pemohon belum terdata di Kependudukan, jadi data diambil dari isian form.
            Periksa baik-baik setiap kolom sebelum mencetak.
          </p>
        )}
        {!bolehTerbitkan && (
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            Akun Anda hanya bisa melihat. Penerbitan surat dilakukan oleh Administrator,
            Sekretaris Desa, Kaur, atau Kasi.
          </p>
        )}

        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div>
            <Label>Jenis surat</Label>
            <select
              className={input}
              value={templateId}
              onChange={(e) => gantiTemplate(e.target.value)}
              disabled={!bolehTerbitkan}
            >
              <option value="">— Pilih jenis surat —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.nama}</option>
              ))}
            </select>
          </div>

          {draf && (
            <>
              <div>
                <Label>Nomor surat *</Label>
                <input
                  className={`${input} ${!nomor.trim() ? kosong : ""}`}
                  value={nomor}
                  onChange={(e) => setNomor(e.target.value)}
                  placeholder="mis. 470/012/DS/X/2026"
                  disabled={!bolehTerbitkan}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tanggal surat</Label>
                  <input type="date" className={input} value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)} disabled={!bolehTerbitkan} />
                </div>
                <div>
                  <Label>Tempat surat dibuat</Label>
                  <input className={input} value={kota}
                    onChange={(e) => setKota(e.target.value)} disabled={!bolehTerbitkan} />
                </div>
              </div>

              <div>
                <Label>Penandatangan</Label>
                <select className={input} value={modeTtd}
                  onChange={(e) => setModeTtd(e.target.value)} disabled={!bolehTerbitkan}>
                  <option value="kades">Kepala Desa</option>
                  <option value="sekdes">a.n. Kepala Desa (Sekretaris Desa)</option>
                </select>
              </div>
              {modeTtd === "sekdes" && (
                <div>
                  <Label>Nama Sekretaris Desa *</Label>
                  <input className={`${input} ${!namaSekdes.trim() ? kosong : ""}`}
                    value={namaSekdes} onChange={(e) => setNamaSekdes(e.target.value)}
                    disabled={!bolehTerbitkan} />
                </div>
              )}
              {modeTtd === "kades" && !config.kepala_desa_nama && (
                <p className="text-xs text-amber-700">
                  Nama Kepala Desa belum diisi di Pengaturan Desa.
                </p>
              )}
              <div>
                <Label>NIP (opsional)</Label>
                <input className={input} value={nip}
                  onChange={(e) => setNip(e.target.value)} disabled={!bolehTerbitkan} />
              </div>
            </>
          )}
        </div>

        {draf && (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-700">Isi surat (boleh diedit)</p>
            {adaKosong && (
              <p className="text-xs text-amber-700">
                Kolom berwarna kuning masih kosong. Lengkapi atau hapus barisnya dari isi surat.
              </p>
            )}
            <div>
              <Label>Judul</Label>
              <input className={input} value={draf.judul}
                onChange={(e) => ubah("judul", e.target.value)} disabled={!bolehTerbitkan} />
            </div>
            <div>
              <Label>Kalimat pembuka</Label>
              <textarea rows={3} className={input} value={draf.pembuka}
                onChange={(e) => ubah("pembuka", e.target.value)} disabled={!bolehTerbitkan} />
            </div>
            {draf.biodata.map((b, i) => (
              <div key={i}>
                <Label>{b.label}</Label>
                <input
                  className={`${input} ${!b.value.trim() ? kosong : ""}`}
                  value={b.value}
                  onChange={(e) => ubahBio(i, e.target.value)}
                  disabled={!bolehTerbitkan}
                />
              </div>
            ))}
            <div>
              <Label>Isi (pisahkan paragraf dengan baris kosong)</Label>
              <textarea rows={7} className={input} value={draf.isi}
                onChange={(e) => ubah("isi", e.target.value)} disabled={!bolehTerbitkan} />
            </div>
            <div>
              <Label>Kalimat penutup</Label>
              <textarea rows={3} className={input} value={draf.penutup}
                onChange={(e) => ubah("penutup", e.target.value)} disabled={!bolehTerbitkan} />
            </div>
          </div>
        )}

        {draf && (
          <div className="space-y-2">
            {pesan && (
              <p className={`rounded-lg p-3 text-sm ${
                pesan.jenis === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                {pesan.teks}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {bolehTerbitkan && (
                <button type="button" onClick={simpan} disabled={pending}
                  className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white transition hover:bg-navy-light disabled:opacity-60">
                  {pending ? "Menyimpan..." : suratTerbit ? "Simpan perubahan surat" : "Simpan & tandai selesai"}
                </button>
              )}
              <button type="button" onClick={() => window.print()}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-navy hover:text-navy">
                Cetak / Simpan PDF
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Di jendela cetak, pilih printer untuk mencetak, atau pilih
              &quot;Simpan sebagai PDF&quot; untuk mengunduh. Ukuran kertas A4.
            </p>
          </div>
        )}
      </div>

      {/* ====== Pratinjau = area cetak ====== */}
      <div className="overflow-x-auto">
        {draf ? (
          <div id="area-cetak" className="mx-auto w-full max-w-[210mm] bg-white p-[18mm] shadow print:max-w-none print:p-0 print:shadow-none"
            style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: "12pt", color: "#000", lineHeight: 1.5 }}>
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
                  {(config.jenis_wilayah === "Kelurahan" ? "KELURAHAN" : "DESA")} {(config.nama_desa || "").toUpperCase()}
                </div>
                {config.alamat && (
                  <div style={{ fontSize: "9.5pt", fontStyle: "italic" }}>{config.alamat}</div>
                )}
              </div>
              {config.logo_url && <div style={{ width: "22mm" }} />}
            </div>

            {/* Judul & nomor */}
            <div className="mt-5 text-center">
              <div style={{ fontWeight: 700, textDecoration: "underline" }}>{draf.judul}</div>
              <div>Nomor: {nomor || "........................"}</div>
            </div>

            <p className="mt-5" style={{ textAlign: "justify" }}>{draf.pembuka}</p>

            <table className="my-3 ml-8" style={{ borderCollapse: "collapse" }}>
              <tbody>
                {draf.biodata.map((b, i) => (
                  <tr key={i} style={{ verticalAlign: "top" }}>
                    <td style={{ paddingRight: "8mm", whiteSpace: "nowrap" }}>{b.label}</td>
                    <td style={{ paddingRight: "3mm" }}>:</td>
                    <td>{b.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {draf.isi.split(/\n{2,}/).filter(Boolean).map((p, i) => (
              <p key={i} className="mb-2" style={{ textAlign: "justify", textIndent: "10mm" }}>{p}</p>
            ))}
            <p className="mt-2" style={{ textAlign: "justify", textIndent: "10mm" }}>{draf.penutup}</p>

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
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
            Pilih jenis surat di sebelah kiri untuk melihat pratinjau.
          </p>
        )}
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
    </div>
  );
}
