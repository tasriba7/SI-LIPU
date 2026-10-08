"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { buatDraf, buatPenandatangan, hariIniISO } from "@/lib/suratTemplate";
import SuratPratinjau from "@/components/dashboard/SuratPratinjau";
import { intipNomor, terbitkanSurat } from "./actions";

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
  sumber = "layanan",
  berkasTtd = { ttdKades: null, ttdSekdes: null, stempel: null },
}) {
  const [templateId, setTemplateId] = useState(templateAwalId || "");
  const template = useMemo(
    () => templates.find((t) => t.id === templateId) || null,
    [templates, templateId]
  );

  const tersimpan = suratTerbit?.isi || null;
  const [draf, setDraf] = useState(() => {
    if (tersimpan) {
      return { judul_atas: "", teks_tengah: "", biodata2: [], ...tersimpan };
    }
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
  const [tampilTtd, setTampilTtd] = useState(!!tersimpan?.tampil_ttd);
  const [tampilStempel, setTampilStempel] = useState(!!tersimpan?.tampil_stempel);
  const [nomorSaran, setNomorSaran] = useState(null);
  const [pesan, setPesan] = useState(null);
  const [pending, mulai] = useTransition();

  const ttd = buatPenandatangan({
    mode: modeTtd,
    namaKades: config.kepala_desa_nama,
    namaSekdes,
    nip,
  });

  // Petunjuk nomor otomatis berikutnya (tidak memakai nomor; baru dipakai saat disimpan).
  useEffect(() => {
    if (!bolehTerbitkan || !templateId) {
      setNomorSaran(null);
      return;
    }
    let batal = false;
    intipNomor({ templateId, tanggal }).then((r) => {
      if (!batal) setNomorSaran(r?.nomor || null);
    });
    return () => {
      batal = true;
    };
  }, [bolehTerbitkan, templateId, tanggal]);

  const gambarTtd = modeTtd === "sekdes" ? berkasTtd.ttdSekdes : berkasTtd.ttdKades;
  const gambar = {
    ttd: tampilTtd ? gambarTtd : null,
    stempel: tampilStempel ? berkasTtd.stempel : null,
  };

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
  function ubahBio(kunci, i, nilai) {
    setDraf((d) => ({
      ...d,
      [kunci]: d[kunci].map((b, idx) => (idx === i ? { ...b, value: nilai } : b)),
    }));
  }

  function simpan() {
    setPesan(null);
    mulai(async () => {
      const r = await terbitkanSurat({
        sumber,
        tampilTtd: !!gambarTtd && tampilTtd,
        tampilStempel: !!berkasTtd.stempel && tampilStempel,
        pengajuanId,
        templateId: templateId || null,
        nomorSurat: nomor,
        tanggalSurat: tanggal,
        kota,
        draf,
        penandatangan: ttd,
      });
      if (r?.nomor) setNomor(r.nomor);
      setPesan(
        r?.error
          ? { jenis: "error", teks: r.error }
          : { jenis: "ok", teks: `Surat tersimpan (nomor ${r.nomor}) & pengajuan ditandai selesai. Sekarang bisa dicetak.` }
      );
    });
  }

  const adaKosong =
    !!draf && [...draf.biodata, ...(draf.biodata2 || [])].some((b) => !b.value.trim());

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
                <Label>Nomor surat {nomorSaran ? "(kosongkan = otomatis)" : "*"}</Label>
                <input
                  className={`${input} ${!nomor.trim() && !nomorSaran ? kosong : ""}`}
                  value={nomor}
                  onChange={(e) => setNomor(e.target.value)}
                  placeholder={nomorSaran ? `Otomatis: ${nomorSaran}` : "mis. 470/012/DS/X/2026"}
                  disabled={!bolehTerbitkan}
                />
                {nomorSaran && !nomor.trim() && (
                  <p className="mt-1 text-[11px] text-slate-400">
                    Nomor dikunci saat Anda menekan simpan. Perkiraan: {nomorSaran}
                  </p>
                )}
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
              {(gambarTtd || berkasTtd.stempel) ? (
                <div className="space-y-1.5 rounded-lg bg-slate-50 p-3">
                  {gambarTtd && (
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" checked={tampilTtd} disabled={!bolehTerbitkan}
                        onChange={(e) => setTampilTtd(e.target.checked)} />
                      Sertakan gambar tanda tangan
                    </label>
                  )}
                  {berkasTtd.stempel && (
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" checked={tampilStempel} disabled={!bolehTerbitkan}
                        onChange={(e) => setTampilStempel(e.target.checked)} />
                      Sertakan stempel
                    </label>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">
                  Gambar tanda tangan/stempel belum diunggah (Pengaturan Desa &rarr; Tanda Tangan &amp; Stempel).
                </p>
              )}
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
            {draf.judul_atas !== undefined && draf.judul_atas !== "" && (
              <div>
                <Label>Teks di atas judul</Label>
                <input className={input} value={draf.judul_atas}
                  onChange={(e) => ubah("judul_atas", e.target.value)} disabled={!bolehTerbitkan} />
              </div>
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
              <div key={`a${i}`}>
                <Label>{b.label}</Label>
                <input
                  className={`${input} ${!b.value.trim() ? kosong : ""}`}
                  value={b.value}
                  onChange={(e) => ubahBio("biodata", i, e.target.value)}
                  disabled={!bolehTerbitkan}
                />
              </div>
            ))}
            {(draf.teks_tengah || draf.biodata2?.length > 0) && (
              <div>
                <Label>Kalimat penghubung (sebelum biodata kedua)</Label>
                <input className={input} value={draf.teks_tengah || ""}
                  onChange={(e) => ubah("teks_tengah", e.target.value)} disabled={!bolehTerbitkan} />
              </div>
            )}
            {(draf.biodata2 || []).map((b, i) => (
              <div key={`b${i}`}>
                <Label>{b.label}</Label>
                <input
                  className={`${input} ${!b.value.trim() ? kosong : ""}`}
                  value={b.value}
                  onChange={(e) => ubahBio("biodata2", i, e.target.value)}
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
          <SuratPratinjau draf={draf} nomor={nomor || (nomorSaran ? `${nomorSaran} (otomatis)` : "")} tanggal={tanggal} kota={kota} ttd={ttd} config={config} gambar={gambar} />
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
            Pilih jenis surat di sebelah kiri untuk melihat pratinjau.
          </p>
        )}
      </div>
    </div>
  );
}
