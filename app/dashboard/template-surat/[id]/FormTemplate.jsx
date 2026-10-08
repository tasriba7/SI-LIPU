"use client";

import { useState, useTransition } from "react";
import { simpanTemplate } from "../actions";

const input =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-navy focus:outline-none";

function Label({ children, bantuan }) {
  return (
    <div className="mb-1">
      <label className="block text-xs font-medium text-slate-500">{children}</label>
      {bantuan && <p className="text-[11px] text-slate-400">{bantuan}</p>}
    </div>
  );
}

function EditorBaris({ judul, bantuan, baris, setBaris }) {
  function ubah(i, kunci, nilai) {
    setBaris((b) => b.map((x, idx) => (idx === i ? { ...x, [kunci]: nilai } : x)));
  }
  function pindah(i, arah) {
    setBaris((b) => {
      const j = i + arah;
      if (j < 0 || j >= b.length) return b;
      const salin = [...b];
      [salin[i], salin[j]] = [salin[j], salin[i]];
      return salin;
    });
  }
  return (
    <div>
      <Label bantuan={bantuan}>{judul}</Label>
      <div className="space-y-2">
        {baris.map((b, i) => (
          <div key={i} className="flex gap-2">
            <input className={`${input} w-40 shrink-0`} placeholder="Label" value={b.label}
              onChange={(e) => ubah(i, "label", e.target.value)} />
            <input className={input} placeholder="{{variabel}} atau teks tetap" value={b.value}
              onChange={(e) => ubah(i, "value", e.target.value)} />
            <button type="button" onClick={() => pindah(i, -1)} aria-label="Naik"
              className="rounded border border-slate-200 px-2 text-xs text-slate-500 hover:border-navy">↑</button>
            <button type="button" onClick={() => pindah(i, 1)} aria-label="Turun"
              className="rounded border border-slate-200 px-2 text-xs text-slate-500 hover:border-navy">↓</button>
            <button type="button" onClick={() => setBaris((x) => x.filter((_, idx) => idx !== i))}
              aria-label="Hapus baris"
              className="rounded border border-red-200 px-2 text-xs text-red-500 hover:bg-red-50">✕</button>
          </div>
        ))}
        <button type="button" onClick={() => setBaris((x) => [...x, { label: "", value: "" }])}
          className="text-xs font-medium text-navy hover:underline">
          + Tambah baris
        </button>
      </div>
    </div>
  );
}

export default function FormTemplate({ template }) {
  const [nama, setNama] = useState(template.nama);
  const [kataKunci, setKataKunci] = useState((template.kata_kunci || []).join(", "));
  const [judulAtas, setJudulAtas] = useState(template.judul_atas || "");
  const [judul, setJudul] = useState(template.judul);
  const [pembuka, setPembuka] = useState(template.pembuka);
  const [biodata, setBiodata] = useState(template.biodata || []);
  const [teksTengah, setTeksTengah] = useState(template.teks_tengah || "");
  const [biodata2, setBiodata2] = useState(template.biodata2 || []);
  const [isi, setIsi] = useState(template.isi || "");
  const [penutup, setPenutup] = useState(template.penutup || "");
  const [formatNomor, setFormatNomor] = useState(template.format_nomor || "");
  const [kelompokNomor, setKelompokNomor] = useState(template.kelompok_nomor || "umum");
  const [pesan, setPesan] = useState(null);
  const [pending, mulai] = useTransition();

  function simpan() {
    setPesan(null);
    mulai(async () => {
      const r = await simpanTemplate({
        id: template.id,
        nama,
        kataKunci: kataKunci.split(","),
        judulAtas,
        judul,
        pembuka,
        biodata,
        teksTengah,
        biodata2,
        isi,
        penutup,
        formatNomor,
        kelompokNomor,
      });
      setPesan(
        r?.error
          ? { jenis: "error", teks: r.error }
          : { jenis: "ok", teks: "Template tersimpan." }
      );
    });
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Nama template</Label>
          <input className={input} value={nama} onChange={(e) => setNama(e.target.value)} />
        </div>
        <div>
          <Label bantuan="Dipisah koma. Template dipilih otomatis bila nama layanan memuat salah satu kata ini.">
            Kata kunci layanan
          </Label>
          <input className={input} value={kataKunci} onChange={(e) => setKataKunci(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label bantuan="Opsional. Teks miring kecil di atas judul.">Teks di atas judul</Label>
          <input className={input} value={judulAtas} onChange={(e) => setJudulAtas(e.target.value)} />
        </div>
        <div>
          <Label>Judul surat</Label>
          <input className={input} value={judul} onChange={(e) => setJudul(e.target.value)} />
        </div>
      </div>

      <div>
        <Label>Kalimat pembuka</Label>
        <textarea rows={3} className={input} value={pembuka} onChange={(e) => setPembuka(e.target.value)} />
      </div>

      <EditorBaris judul="Biodata (blok pertama)" baris={biodata} setBaris={setBiodata} />

      <div>
        <Label bantuan="Opsional. Dipakai bila surat punya dua blok biodata (mis. kelahiran & kematian).">
          Kalimat penghubung
        </Label>
        <input className={input} value={teksTengah} onChange={(e) => setTeksTengah(e.target.value)} />
      </div>

      <EditorBaris judul="Biodata kedua (opsional)" baris={biodata2} setBaris={setBiodata2} />

      <div>
        <Label bantuan="Pisahkan paragraf dengan baris kosong. Boleh dikosongkan.">Isi surat</Label>
        <textarea rows={6} className={input} value={isi} onChange={(e) => setIsi(e.target.value)} />
      </div>
      <div>
        <Label>Kalimat penutup</Label>
        <textarea rows={3} className={input} value={penutup} onChange={(e) => setPenutup(e.target.value)} />
      </div>

      <div className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2">
        <div>
          <Label bantuan="Penanda: {urut} {urut3} {bulan} {bulan_romawi} {tahun}. Kosong = nomor diketik manual.">
            Format nomor otomatis
          </Label>
          <input className={input} value={formatNomor} onChange={(e) => setFormatNomor(e.target.value)}
            placeholder="470/{urut3}/DS/{bulan_romawi}/{tahun}" />
        </div>
        <div>
          <Label bantuan="Template dengan kelompok sama berbagi satu urutan. Urutan mulai dari 1 tiap tahun.">
            Kelompok urutan
          </Label>
          <input className={input} value={kelompokNomor} onChange={(e) => setKelompokNomor(e.target.value)} />
        </div>
      </div>

      {pesan && (
        <p className={`rounded-lg p-3 text-sm ${pesan.jenis === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
          {pesan.teks}
        </p>
      )}
      <button type="button" onClick={simpan} disabled={pending}
        className="rounded-lg bg-navy px-5 py-2.5 text-sm font-medium text-white transition hover:bg-navy-light disabled:opacity-60">
        {pending ? "Menyimpan..." : "Simpan template"}
      </button>
    </div>
  );
}
