import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { jagaHalamanPilkades } from "@/lib/akses";
import { getConfigDesa } from "@/lib/configDesa";
import { ambilPeriode, ambilDptTerbaru, ambilSusunanPanitia, ambilLogoPanitia } from "@/lib/pilkades";
import TombolCetak from "../TombolCetak";

export const metadata = { title: "Surat Undangan Memilih" };

const KERTAS = { a4: { l: 210, t: 297 }, f4: { l: 215, t: 330 } };
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const TITIK = "……………………………………………";

// "yyyy-mm-dd" -> { hariTanggal: "Sabtu/24 September 2022", bulanTahun: "September 2022" } tanpa geser zona waktu.
function olahTanggal(t) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t ?? "");
  if (!m) return { hariTanggal: "…………/…… ……………… ………", bulanTahun: "……………… ………" };
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return {
    hariTanggal: `${HARI[d.getUTCDay()]}/${+m[3]} ${BULAN[+m[2] - 1]} ${m[1]}`,
    bulanTahun: `${BULAN[+m[2] - 1]} ${m[1]}`,
  };
}

export default async function CetakUndangan({ searchParams }) {
  const sp = await searchParams;
  const supabase = await createClient();
  await jagaHalamanPilkades(supabase);
  const periode = await ambilPeriode(supabase);
  if (!periode) redirect("/dashboard/pilkades");

  const dpt = await ambilDptTerbaru(supabase, periode.id);
  if (!dpt.head) redirect("/dashboard/pilkades/undangan");

  const [{ data: tpsList }, desa, susunan, logo] = await Promise.all([
    supabase.from("pilkades_tps").select("nama, lokasi").eq("periode_id", periode.id),
    getConfigDesa(supabase),
    ambilSusunanPanitia(supabase, periode.id),
    ambilLogoPanitia(supabase, periode.id),
  ]);
  const lokasiTps = Object.fromEntries((tpsList ?? []).map((t) => [t.nama, t.lokasi]));

  const kertas = KERTAS[sp.kertas] ? sp.kertas : "f4";
  const { l, t } = KERTAS[kertas];
  const fTps = String(sp.tps ?? "");
  const fDusun = String(sp.dusun ?? "");
  const pukul = String(sp.pukul ?? "").trim().slice(0, 40) || "07.00 s/d 14.00 WITA";
  const kosong = Math.min(200, Math.max(0, parseInt(sp.kosong ?? "0", 10) || 0));

  const terisi = dpt.isi
    .filter((r) => (!fTps || r.tps_nama === fTps) && (!fDusun || r.dusun === fDusun))
    .sort((a, b) => (a.tps_nama ?? "").localeCompare(b.tps_nama ?? "", "id") || a.urut - b.urut);
  const surat = [
    ...terisi.map((r) => ({ nama: r.nama_lengkap, urut: r.urut, nik: r.nik_samar, tps: r.tps_nama })),
    ...Array.from({ length: kosong }, () => ({ nama: null, urut: null, nik: null, tps: fTps || null })),
  ];
  if (!surat.length) redirect("/dashboard/pilkades/undangan");

  await supabase.rpc("pilkades_catat", {
    p_periode: periode.id,
    p_aksi: "cetak_undangan",
    p_detail: `${terisi.length} undangan${kosong ? ` + ${kosong} kosong` : ""} · ${fTps || "Semua TPS"}${fDusun ? ` · Dusun ${fDusun}` : ""} · DPT versi ${dpt.head.versi}`,
  });

  const sebutan = desa.jenis_wilayah ?? "Desa";
  const namaDesa = desa.nama_desa ?? "";
  const { hariTanggal, bulanTahun } = olahTanggal(periode.tanggal_pemungutan);
  const ketua = susunan.ketua?.nama ?? null;
  const sekretaris = susunan.sekretaris?.nama ?? null;

  const lembar = [];
  for (let i = 0; i < surat.length; i += 2) lembar.push(surat.slice(i, i + 2));

  const Surat = ({ s }) => {
    const lokasi = s.tps ? `${s.tps}${lokasiTps[s.tps] ? ` — ${lokasiTps[s.tps]}` : ""}` : TITIK;
    return (
      <div className="slip">
        <div className="judul">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logo && <img src={logo.url} alt="" className="logo" />}
          <b>SURAT UNDANGAN<br />PEMUNGUTAN<br />SUARA</b>
        </div>

        <p className="isi">
          Bersama ini diberitahukan bahwa Panitia Pemilihan Kepala {sebutan} {namaDesa} mengundang Saudara{" "}
          {s.nama ? <b>{s.nama}</b> : "………………………………………………"} No urut dalam DPT/DPTb/DPK *) :{" "}
          {s.urut ?? "………"}, NIK/Identitas lain {s.nik ? <b>{s.nik}</b> : "……………………………………"} untuk memberikan suara pada
          Pemilihan Kepala {sebutan} {namaDesa} yang akan dilaksanakan pada:
        </p>

        <table className="jadwal">
          <tbody>
            <tr><td>Hari/Tanggal</td><td>:</td><td>{hariTanggal}</td></tr>
            <tr><td><b>Pukul</b></td><td>:</td><td>{pukul}</td></tr>
            <tr><td>Tempat Pemungutan Suara (TPS)</td><td>:</td><td>{lokasi}</td></tr>
          </tbody>
        </table>

        <div className="bawah">
          <div className="cara">
            Cara memilih Kepala {sebutan} {namaDesa}:
            <ul><li>Coblos pada nomor atau tanda gambar calon dan/atau nama calon.</li></ul>
          </div>
          <div className="ttd">
            <div>{namaDesa}, ………… {bulanTahun}</div>
            <div className="panitia">PANITIA PEMILIHAN KEPALA {sebutan.toUpperCase()} {namaDesa.toUpperCase()}</div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "8mm", marginTop: "1mm" }}>
              <div>
                <div>Ketua,</div>
                <div className="ruang" />
                <div>({ketua ? <u>{ketua}</u> : "……………………………"})</div>
              </div>
              <div>
                <div>Sekretaris,</div>
                <div className="ruang" />
                <div>({sekretaris ? <u>{sekretaris}</u> : "……………………………"})</div>
              </div>
            </div>
          </div>
        </div>

        <div className="catatan"><u><b>Catatan :</b></u><br />1. Pemungutan suara Pilkades dimulai pada pukul {pukul.replace(/\s*(WIB|WITA|WIT)\b.*$/i, "")}.</div>

        <div className="gunting"><span className="alat">✂</span><span className="garis" /><i>gunting disini</i><span className="garis" /></div>

        <div className="tanda-terima">
          <div><div>Yang menyerahkan</div><div className="ruang2" /><div>(……………………………….)</div><div>Nama Jelas</div></div>
          <div><div>Yang Menerima</div><div className="ruang2" /><div>(……………………………….)</div><div>Nama Jelas</div></div>
          <div className="tgl">Diterima Tgl. ………………….</div>
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{`
        @page { size: ${l}mm ${t}mm; margin: 0; }
        html, body { background: #fff; margin: 0; }
        .lembar { width: ${l}mm; height: ${t}mm; display: flex; flex-direction: column; page-break-after: always; break-after: page; box-sizing: border-box; font-family: "Times New Roman", serif; color: #000; }
        .lembar:last-child { page-break-after: auto; break-after: auto; }
        .slip { flex: 1 1 0; min-height: 0; box-sizing: border-box; padding: 7mm 14mm 4mm; font-size: 10pt; line-height: 1.35; position: relative; overflow: hidden; }
        .slip + .slip { border-top: 0.3mm dashed #94a3b8; }
        .judul { position: relative; text-align: center; margin: 0 auto 3mm; font-size: 11pt; line-height: 1.2; min-height: 17mm; }
        .judul .logo { position: absolute; left: 6mm; top: 0; height: 17mm; max-width: 22mm; object-fit: contain; }
        .isi { margin: 0 0 2mm; text-align: justify; text-indent: 9mm; }
        .jadwal { margin: 0 0 2mm 9mm; border-collapse: collapse; }
        .jadwal td { padding: 0.4mm 2mm 0.4mm 0; vertical-align: top; }
        .jadwal td:first-child { width: 64mm; }
        .jadwal td:nth-child(2) { width: 5mm; }
        .bawah { display: flex; justify-content: space-between; align-items: flex-start; margin: 1mm 0 2mm; }
        .cara { width: 74mm; border: 0.3mm solid #000; padding: 1.2mm 2mm; font-size: 7.5pt; line-height: 1.25; margin-top: 7mm; }
        .cara ul { margin: 0; padding-left: 4mm; }
        .ttd { width: 92mm; text-align: left; font-size: 9.5pt; padding-left: 4mm; }
        .ttd .panitia { text-align: center; font-weight: 700; margin: 2.5mm 0 0; line-height: 1.25; }
        .ttd .ruang { height: 8mm; }
        .ttd > div:last-child { text-align: center; }
        .catatan { font-size: 9.5pt; margin-bottom: 1mm; }
        .gunting { display: flex; align-items: center; gap: 1mm; font-size: 8.5pt; margin: 0.5mm -6mm 0.5mm -9mm; }
        .gunting .alat { font-size: 15pt; line-height: 1; }
        .gunting .garis { flex: 1; border-top: 0.45mm dashed #000; }
        .tanda-terima { display: flex; gap: 8mm; font-size: 9.5pt; padding-left: 9mm; }
        .tanda-terima > div { text-align: center; }
        .tanda-terima .tgl { align-self: flex-start; padding-top: 0; margin-left: 6mm; text-align: left; }
        .ruang2 { height: 7mm; }
        @media print { .no-print, button { display: none !important; } }
        @media screen { .lembar { margin: 12px auto; border: 1px solid #cbd5e1; } }
      `}</style>

      <TombolCetak
        petunjuk={<>Di dialog cetak: pilih kertas <b>{kertas === "f4" ? "F4/Folio 215 × 330 mm (atau kustom)" : "A4"}</b>, orientasi <b>Potret</b>, margin <b>Tidak ada</b>, skala <b>100%</b>, aktifkan <b>Grafik latar belakang</b>. Satu lembar = 2 surat; gunting di garis putus-putus tengah bila ingin dipisah. {surat.length} surat · {lembar.length} lembar.</>}
      />

      {lembar.map((dua, i) => (
        <section className="lembar" key={i}>
          {dua.map((s, j) => <Surat key={j} s={s} />)}
          {dua.length === 1 && <div className="slip" />}
        </section>
      ))}
    </>
  );
}
