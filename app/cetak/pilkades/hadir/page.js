import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { jagaHalamanPilkades } from "@/lib/akses";
import { getConfigDesa } from "@/lib/configDesa";
import {
  ambilPeriode, ambilDptTerbaru, ambilSusunanPanitia, susunPenandatangan,
  ambilLogoPanitia, formatTanggal,
} from "@/lib/pilkades";
import BlokTtd from "@/components/pilkades/BlokTtd";
import TombolCetak from "../TombolCetak";

export const metadata = { title: "Cetak Daftar Hadir Pemilih" };

// Ukuran kertas (mm): l = sisi pendek, t = sisi panjang.
const KERTAS = { a4: { l: 210, t: 297 }, f4: { l: 215, t: 330 } };

// Tata letak halaman, semua dalam mm. Tiap baris nama TEPAT 1 cm supaya kolom
// tanda tangan pemilih cukup lega; margin sengaja kecil agar muat banyak nama.
const TINGGI_BARIS = 10;
const MARGIN = 5;
const TINGGI_KOP = 17;
const TINGGI_KEPALA_TABEL = 8;
const TINGGI_KAKI = 12;
const BARIS_TAMBAHAN_TTD = 2; // halaman terakhir menampung blok tanda tangan panitia
const CADANGAN = 1;

function bagiHalaman(item, baris, kolom) {
  const kap = baris * kolom;
  const barisAkhir = Math.max(1, baris - BARIS_TAMBAHAN_TTD);
  const kapAkhir = barisAkhir * kolom;
  const hal = [];
  let i = 0;
  while (item.length - i > kapAkhir) {
    // sisakan beberapa nama untuk halaman terakhir (tempat blok tanda tangan),
    // supaya tidak ada lembar yang hanya berisi 1 nama.
    const sisakan = Math.max(1, Math.min(6, kapAkhir, item.length - i - 1));
    const ambil = Math.min(kap, item.length - i - sisakan);
    hal.push({ isi: item.slice(i, i + ambil), baris, mulai: i });
    i += ambil;
  }
  hal.push({ isi: item.slice(i), baris: barisAkhir, mulai: i });
  return hal;
}

export default async function CetakDaftarHadir({ searchParams }) {
  const sp = await searchParams;
  const supabase = await createClient();
  await jagaHalamanPilkades(supabase);
  const periode = await ambilPeriode(supabase);
  if (!periode) redirect("/dashboard/pilkades");

  const dpt = await ambilDptTerbaru(supabase, periode.id);
  if (!dpt.head) redirect("/dashboard/pilkades/hari-h/hadir");

  const [desa, susunan, logo] = await Promise.all([
    getConfigDesa(supabase),
    ambilSusunanPanitia(supabase, periode.id),
    ambilLogoPanitia(supabase, periode.id),
  ]);

  const fTps = String(sp.tps ?? "");
  const fDusun = String(sp.dusun ?? "");
  const tampilNik = sp.nik === "1";
  const kertas = KERTAS[sp.kertas] ? sp.kertas : "f4";
  const dua = sp.tata !== "1kolom"; // bawaan: 2 kolom lanskap = paling banyak nama per lembar
  const tambahan = Math.min(100, Math.max(0, parseInt(sp.tambahan ?? "0", 10) || 0));

  const terisi = dpt.isi
    .filter(
      (r) =>
        (!fTps || (r.tps_nama ?? "Tanpa TPS") === fTps) &&
        (!fDusun || r.dusun === fDusun)
    )
    .sort((a, b) => (a.tps_nama ?? "").localeCompare(b.tps_nama ?? "", "id") || a.urut - b.urut);

  const semua = [
    ...terisi.map((r) => ({ nama: r.nama_lengkap, nik: r.nik_samar, dusun: r.dusun, rt: r.rt, rw: r.rw })),
    ...Array.from({ length: tambahan }, () => ({ nama: null, nik: null, dusun: null, rt: null, rw: null })),
  ].map((r, i) => ({ ...r, no: i + 1 }));

  if (!semua.length) redirect("/dashboard/pilkades/hari-h/hadir");

  const sasaranTps = fTps || "Semua TPS";
  await supabase.rpc("pilkades_catat", {
    p_periode: periode.id,
    p_aksi: "cetak_hadir",
    p_detail: `${terisi.length} nama${tambahan ? ` + ${tambahan} kosong` : ""} · ${sasaranTps}${fDusun ? ` · Dusun ${fDusun}` : ""} · DPT versi ${dpt.head.versi}`,
  });

  // Ukuran halaman: 2 kolom = lanskap, 1 kolom = potret.
  const { l, t } = KERTAS[kertas];
  const lebar = dua ? t : l;
  const tinggi = dua ? l : t;
  const kolom = dua ? 2 : 1;
  const barisPerKolom = Math.max(
    3,
    Math.floor((tinggi - 2 * MARGIN - CADANGAN - TINGGI_KOP - TINGGI_KEPALA_TABEL - TINGGI_KAKI) / TINGGI_BARIS)
  );
  const halaman = bagiHalaman(semua, barisPerKolom, kolom);
  const jumlahHal = halaman.length;

  const cetakPada = new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Makassar" });
  const sebutan = desa.jenis_wilayah ?? "Desa";
  const namaDesa = `${sebutan} ${desa.nama_desa ?? ""}`.trim();
  const penandatangan = susunPenandatangan("daftar_hadir", susunan);
  const tempatTanggal = periode.tanggal_pemungutan
    ? `${desa.nama_desa ?? ""}${desa.nama_desa ? ", " : ""}${formatTanggal(periode.tanggal_pemungutan)}`
    : null;
  const sasaran = [sasaranTps, fDusun && `Dusun ${fDusun}`].filter(Boolean).join(" · ");

  // Rangkuman angka per TPS (dari nama yang dicetak). Kolom "Jumlah hadir" dikosongkan:
  // petugas mengisinya dengan tangan setelah menghitung tanda tangan, lalu angkanya
  // dimasukkan ke aplikasi di tab Hasil Suara.
  const rangkumanMap = new Map();
  for (const r of terisi) {
    const k = r.tps_nama ?? "Tanpa TPS";
    const e = rangkumanMap.get(k) ?? { tps: k, dpt: 0, tambahan: 0 };
    if (r.tambahan) e.tambahan += 1;
    else e.dpt += 1;
    rangkumanMap.set(k, e);
  }
  const rangkuman = [...rangkumanMap.values()].sort((a, b) => a.tps.localeCompare(b.tps, "id"));
  const adaRangkumanHalaman = rangkuman.length > 1;
  const jumlahDpt = rangkuman.reduce((n, e) => n + e.dpt, 0);
  const jumlahTambahan = rangkuman.reduce((n, e) => n + e.tambahan, 0);

  const Tabel = ({ rows }) => (
    <table className="tbl">
      <thead>
        <tr>
          <th style={{ width: "6%" }}>No</th>
          <th style={{ width: "32%" }}>Nama</th>
          <th style={{ width: "20%" }}>Dusun, RT/RW</th>
          <th style={{ width: "42%" }}>Tanda Tangan</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.no}>
            <td className="c">{r.no}</td>
            <td>
              <div className="nm">{r.nama ?? ""}</div>
              {tampilNik && r.nik && <div className="nk">{r.nik}</div>}
            </td>
            <td>
              <div className="nm">
                {[r.dusun, r.rt || r.rw ? `${r.rt ?? "-"}/${r.rw ?? "-"}` : null].filter(Boolean).join(", ")}
              </div>
            </td>
            {/* tanda tangan selang-seling (ganjil di kiri, genap di tengah) supaya tidak bertabrakan */}
            <td><span className={r.no % 2 ? "stg kiri" : "stg tengah"}>{r.no}.</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <>
      <style>{`
        @page { size: ${lebar}mm ${tinggi}mm; margin: ${MARGIN}mm; }
        html, body { background: #fff; }
        .hal { position: relative; page-break-after: always; break-after: page; font-family: Arial, sans-serif; color: #000; }
        .hal:last-child { page-break-after: auto; break-after: auto; }
        .kop { position: relative; text-align: center; line-height: 1.2; height: ${TINGGI_KOP}mm; box-sizing: border-box; padding: 0 22mm; overflow: hidden; }
        .kop .logo-kop { position: absolute; left: 0; top: 0; height: 13mm; max-width: 20mm; object-fit: contain; }
        .kop h1 { font-size: 12.5pt; margin: 0; font-weight: 700; }
        .kop p { font-size: 9pt; margin: 0.4mm 0 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .kolom { display: grid; grid-template-columns: repeat(${kolom}, minmax(0, 1fr)); gap: 5mm; }
        .kolom > * { min-width: 0; }
        .tbl { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 9.5pt; }
        .tbl th, .tbl td { border: 0.35mm solid #000; box-sizing: border-box; padding: 0 1.2mm; overflow: hidden; }
        .tbl th { height: 7mm; background: #e5e7eb; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .tbl td { height: ${TINGGI_BARIS}mm; vertical-align: middle; }
        .tbl td.c { text-align: center; }
        .nm { line-height: 1.15; max-height: 8.6mm; overflow: hidden; }
        .nk { font-size: 7.5pt; color: #333; line-height: 1.1; }
        .stg { display: block; font-size: 7.5pt; color: #666; }
        .stg.tengah { padding-left: 50%; }
        .kaki { display: flex; justify-content: space-between; align-items: flex-end; gap: 6mm; margin-top: 1.5mm; font-size: 8pt; line-height: 1.25; }
        .ttd-grup { text-align: center; font-size: 8.5pt; line-height: 1.15; }
        .ttd-tempat { margin-bottom: 0.3mm; }
        .ttd-judul { font-weight: 700; margin-bottom: 0.3mm; }
        .ttd-baris { display: flex; gap: 10mm; justify-content: center; }
        .ttd { text-align: center; min-width: 55mm; }
        .ttd .ruang { height: 9mm; }
        .ttd-nama { font-weight: 700; }
        .rkp { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 10pt; margin-top: 4mm; }
        .rkp th, .rkp td { border: 0.35mm solid #000; padding: 1.5mm 2mm; text-align: center; }
        .rkp th { background: #e5e7eb; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .rkp td.kiri { text-align: left; }
        .rkp td.isi { height: 9mm; }
        .rkp-judul { font-size: 11pt; font-weight: 700; margin: 4mm 0 0; }
        .rkp-baris { font-size: 8.5pt; font-weight: 700; margin-bottom: 0.6mm; }
        @media print { .no-print, button { display: none !important; } }
        @media screen { .hal { max-width: ${lebar}mm; margin: 12px auto; padding: ${MARGIN}mm; border: 1px solid #cbd5e1; background: #fff; box-sizing: content-box; } }
      `}</style>

      <TombolCetak
        petunjuk={
          <>
            Di dialog cetak: pilih kertas <b>{kertas === "f4" ? "F4/Folio 330 x 215 mm (atau kertas kustom)" : "A4"}</b>, orientasi{" "}
            <b>{dua ? "Lanskap" : "Potret"}</b>, margin <b>Default</b> (dokumen sudah mengatur margin {MARGIN} mm), skala <b>100%</b>.
            Tiap baris nama setinggi 1 cm; {barisPerKolom * kolom} nama per lembar.
          </>
        }
      />

      {halaman.map((h, n) => {
        const mulai = h.mulai;
        const kiri = h.isi.slice(0, h.baris);
        const kanan = dua ? h.isi.slice(h.baris) : [];
        const akhir = n === jumlahHal - 1;
        return (
          <section className="hal" key={n}>
            <div className="kop">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {logo && <img src={logo.url} alt="" className="logo-kop" />}
              <h1>DAFTAR HADIR PEMILIH</h1>
              <p>{periode.nama.toUpperCase()} · {namaDesa.toUpperCase()}</p>
              <p>{sasaran} · Pemungutan suara: {formatTanggal(periode.tanggal_pemungutan)}</p>
            </div>

            <div className="kolom">
              <Tabel rows={kiri} />
              {dua && kanan.length > 0 && <Tabel rows={kanan} />}
            </div>

            <div className="kaki">
              <div>
                {akhir && (
                  <div className="rkp-baris">
                    Rangkuman: {terisi.length} nama tercantum (DPT {jumlahDpt} + Pemilih Tambahan {jumlahTambahan}) · Jumlah hadir (diisi petugas): ……………… orang
                  </div>
                )}
                Halaman {n + 1} dari {jumlahHal} · Nomor {mulai + 1}–{mulai + h.isi.length} dari {semua.length} orang<br />
                DPT versi {dpt.head.versi} (ditetapkan {formatTanggal(dpt.head.tanggal_penetapan)}) · Dicetak {cetakPada}
              </div>
              {akhir && (
                <BlokTtd
                  judulPanitia={`Panitia Pemilihan Kepala ${sebutan}`}
                  tempatTanggal={tempatTanggal}
                  penandatangan={penandatangan}
                />
              )}
            </div>
          </section>
        );
      })}

      {adaRangkumanHalaman && (
        <section className="hal">
          <div className="kop">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {logo && <img src={logo.url} alt="" className="logo-kop" />}
            <h1>RANGKUMAN DAFTAR HADIR PER TPS</h1>
            <p>{periode.nama.toUpperCase()} · {namaDesa.toUpperCase()}</p>
            <p>{sasaran} · Pemungutan suara: {formatTanggal(periode.tanggal_pemungutan)}</p>
          </div>
          <p className="rkp-judul">Isi kolom “Jumlah hadir” dengan jumlah tanda tangan di daftar hadir tiap TPS.</p>
          <table className="rkp">
            <thead>
              <tr>
                <th style={{ width: "26%" }}>TPS</th>
                <th>Pemilih di DPT</th>
                <th>Pemilih Tambahan</th>
                <th>Jumlah terdaftar</th>
                <th style={{ width: "20%" }}>Jumlah hadir</th>
                <th style={{ width: "14%" }}>Paraf</th>
              </tr>
            </thead>
            <tbody>
              {rangkuman.map((e) => (
                <tr key={e.tps}>
                  <td className="kiri isi">{e.tps}</td>
                  <td>{e.dpt}</td>
                  <td>{e.tambahan}</td>
                  <td>{e.dpt + e.tambahan}</td>
                  <td />
                  <td />
                </tr>
              ))}
              <tr>
                <td className="kiri isi"><b>Jumlah</b></td>
                <td><b>{jumlahDpt}</b></td>
                <td><b>{jumlahTambahan}</b></td>
                <td><b>{jumlahDpt + jumlahTambahan}</b></td>
                <td />
                <td />
              </tr>
            </tbody>
          </table>
          <div className="kaki">
            <div>DPT versi {dpt.head.versi} (ditetapkan {formatTanggal(dpt.head.tanggal_penetapan)}) · Dicetak {cetakPada}</div>
            <BlokTtd
              judulPanitia={`Panitia Pemilihan Kepala ${sebutan}`}
              tempatTanggal={tempatTanggal}
              penandatangan={penandatangan}
            />
          </div>
        </section>
      )}
    </>
  );
}
