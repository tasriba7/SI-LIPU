import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { jagaHalamanPilkades } from "@/lib/akses";
import { getConfigDesa } from "@/lib/configDesa";
import { ambilPeriode, hitungUmur, formatTanggal, STATUS_VERIFIKASI } from "@/lib/pilkades";
import TombolCetak from "./TombolCetak";

export const metadata = { title: "Cetak Daftar Pemilih" };

const BARIS_PER_KOLOM = 30; // F4 lanskap, font 9 pt, 2 kolom berdampingan
const KOLOM_PER_HALAMAN = 2;

export default async function CetakPilkades({ searchParams }) {
  const sp = await searchParams;
  const supabase = await createClient();
  await jagaHalamanPilkades(supabase);
  const periode = await ambilPeriode(supabase);
  if (!periode) redirect("/dashboard/pilkades");

  const [{ data: semua }, { data: tpsList }, desa] = await Promise.all([
    supabase.rpc("pilkades_daftar_pemilih", { p_periode: periode.id }),
    supabase.from("pilkades_tps").select("id, nama, lokasi").eq("periode_id", periode.id),
    getConfigDesa(supabase),
  ]);

  const tpsNama = Object.fromEntries((tpsList ?? []).map((t) => [t.id, t.nama]));
  const fTps = sp.tps ?? "";
  const fDusun = sp.dusun ?? "";
  const fStatus = sp.status ?? "memenuhi_syarat"; // "semua" = tanpa filter status
  const tampilNik = sp.nik === "1";

  const baris = (semua ?? []).filter(
    (r) =>
      (!fTps || (fTps === "none" ? !r.tps_id : r.tps_id === fTps)) &&
      (!fDusun || r.dusun === fDusun) &&
      (fStatus === "semua" || r.status_verifikasi === fStatus)
  );

  const acuan = periode.tanggal_pemungutan ? new Date(periode.tanggal_pemungutan) : new Date();
  const per = BARIS_PER_KOLOM * KOLOM_PER_HALAMAN;
  const jumlahHal = Math.max(1, Math.ceil(baris.length / per));
  const halaman = Array.from({ length: jumlahHal }, (_, i) => baris.slice(i * per, (i + 1) * per));

  const judulTps =
    fTps && fTps !== "none" ? tpsList?.find((t) => t.id === fTps) : null;
  const sasaran = [judulTps?.nama, fDusun && `Dusun ${fDusun}`].filter(Boolean).join(" · ") || "Seluruh desa";
  const cetakPada = new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" });
  const namaDesa = `${desa.jenis_wilayah ?? "Desa"} ${desa.nama_desa ?? ""}`.trim();

  const Tabel = ({ rows, mulai }) => (
    <table className="tbl">
      <thead>
        <tr>
          <th style={{ width: "6%" }}>No</th>
          <th>Nama</th>
          {tampilNik && <th style={{ width: "22%" }}>NIK</th>}
          <th style={{ width: "5%" }}>L/P</th>
          <th style={{ width: "10%" }}>Umur</th>
          <th style={{ width: "17%" }}>Dusun, RT/RW</th>
          <th style={{ width: "9%" }}>TPS</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.id}>
            <td>{mulai + i + 1}</td>
            <td>{r.nama_lengkap}</td>
            {tampilNik && <td>{r.nik_samar}</td>}
            <td>{r.jenis_kelamin?.toString().trim().toUpperCase().startsWith("P") ? "P" : "L"}</td>
            <td>{hitungUmur(r.tanggal_lahir, acuan) ?? "-"}</td>
            <td>{[r.dusun, r.rt || r.rw ? `${r.rt ?? "-"}/${r.rw ?? "-"}` : null].filter(Boolean).join(", ")}</td>
            <td>{tpsNama[r.tps_id] ?? "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <>
      <style>{`
        @page { size: 330mm 215mm; margin: 6mm; }
        html, body { background: #fff; }
        .hal { position: relative; page-break-after: always; break-after: page; font-family: Arial, sans-serif; color: #000; padding: 4mm 6mm; }
        .hal:last-child { page-break-after: auto; break-after: auto; }
        .kop { text-align: center; line-height: 1.25; margin-bottom: 3mm; }
        .kop h1 { font-size: 14pt; margin: 0; font-weight: 700; }
        .kop p { font-size: 9.5pt; margin: 0; }
        .kolom { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; }
        .tbl { width: 100%; border-collapse: collapse; font-size: 9pt; table-layout: fixed; }
        .tbl th, .tbl td { border: 0.4mm solid #000; padding: 0.4mm 1.2mm; height: 4.6mm; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
        .tbl th { background: #e5e7eb; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .kaki { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 3mm; font-size: 8.5pt; }
        .ttd { text-align: center; min-width: 70mm; }
        .ttd .ruang { height: 12mm; }
        .tanda-air { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none;
          font-size: 110pt; font-weight: 800; color: rgba(0,0,0,0.07); transform: rotate(-20deg); letter-spacing: 8mm; }
        @media print { .no-print, button { display: none !important; } }
        @media screen { .hal { max-width: 330mm; margin: 12px auto; border: 1px solid #cbd5e1; background: #fff; } }
      `}</style>

      <TombolCetak />

      {halaman.map((isi, h) => (
        <section className="hal" key={h}>
          <div className="tanda-air">DRAF</div>
          <div className="kop">
            <h1>DAFTAR PEMILIH {STATUS_VERIFIKASI[fStatus] && fStatus !== "memenuhi_syarat" ? `(${STATUS_VERIFIKASI[fStatus].toUpperCase()}) ` : ""}— DRAF</h1>
            <p>{periode.nama.toUpperCase()} · {namaDesa.toUpperCase()}</p>
            <p>{sasaran} · Pemungutan suara: {formatTanggal(periode.tanggal_pemungutan)}</p>
          </div>

          <div className="kolom">
            <Tabel rows={isi.slice(0, BARIS_PER_KOLOM)} mulai={h * per} />
            <Tabel rows={isi.slice(BARIS_PER_KOLOM)} mulai={h * per + BARIS_PER_KOLOM} />
          </div>

          <div className="kaki">
            <div>
              Halaman {h + 1} dari {jumlahHal} · Jumlah dalam daftar ini: {baris.length} orang<br />
              Dicetak: {cetakPada} · Belum ditetapkan sebagai DPS/DPT
            </div>
            {h === jumlahHal - 1 && (
              <div className="ttd">
                <div>Panitia Pemilihan Kepala {desa.jenis_wilayah ?? "Desa"}</div>
                <div className="ruang" />
                <div>(............................................)</div>
              </div>
            )}
          </div>
        </section>
      ))}

      {!baris.length && (
        <p style={{ padding: 24, fontFamily: "sans-serif" }}>
          Tidak ada data untuk filter ini. Kembali ke menu Cetak Daftar dan ubah pilihan.
        </p>
      )}
    </>
  );
}
