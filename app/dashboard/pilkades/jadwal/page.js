import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ambilRole } from "@/lib/akses";
import { bisaUbahPilkades, isAdminRole } from "@/lib/roles";
import { ambilPeriode } from "@/lib/pilkades";
import { ambilJadwalLengkap, periksaUrutan } from "@/lib/pilkadesJadwal";
import { pesanDari, teknis } from "@/lib/pilkadesPesan";
import PesanSekali from "@/components/pilkades/PesanSekali";
import { GarisWaktu } from "@/components/pilkades/GarisWaktu";
import { JudulHalaman, Catatan, Kartu, KosongPandu, tombol } from "@/components/pilkades/UI";
import FormJadwal from "./FormJadwal";
import TombolResetTahapan from "./TombolResetTahapan";

export const metadata = { title: "Jadwal Tahapan — Pilkades" };

const PESAN_HASIL = {
  ok: (sp) => ["sukses", "Jadwal tersimpan", `${sp.n} tahapan tersimpan. Progres dan garis waktu di beranda ikut diperbarui.`],
  reset: (sp) =>
    sp.mode === "semua"
      ? ["sukses", "Semua data periode ini sudah direset", "Pemilih, TPS, DPS/DPT, calon, rekap suara, susunan panitia, jadwal, dan riwayat sudah dihapus. Periode dan data penduduk tetap ada. Semua menu tahapan kembali terkunci."]
      : ["sukses", "Tahapan terpilih sudah direset", "Tanggal dan catatan tahapan yang dicentang sudah dikosongkan. Nama dan urutan tahapan tidak berubah."],
};

async function hitung(supabase, tabel, periodeId) {
  const { count } = await supabase.from(tabel).select("*", { count: "exact", head: true }).eq("periode_id", periodeId);
  return count ?? 0;
}

export default async function JadwalPage({ searchParams }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const periode = await ambilPeriode(supabase);
  const { role } = await ambilRole(supabase);
  const bisaUbah = bisaUbahPilkades(role);
  if (!periode) {
    return <KosongPandu judul="Belum ada periode Pilkades" href="/dashboard/pilkades/pengaturan/periode" label="Buka Periode Pilkades" />;
  }

  const j = await ambilJadwalLengkap(supabase, periode);
  const awal = j.tahap.map((t) => ({ jenis: t.jenis ?? "", nama: t.nama, arti: t.arti, mulai: t.mulai && t.jenis !== "pemungutan" ? t.mulai : "", selesai: t.selesai ?? "", catatan: t.catatan }));
  const urutan = periksaUrutan(j.tahap);

  // Ringkasan data yang akan terhapus pada "Reset semua" (hanya dibutuhkan panitia).
  let ringkas = {};
  if (bisaUbah) {
    const [pemilih, tps, arsip, tambahan, hadir, calon, rekapTps, hasil, panitia, logo, riwayat] = await Promise.all([
      "pilkades_pemilih", "pilkades_tps", "pilkades_daftar_tetap", "pilkades_pemilih_tambahan", "pilkades_hadir",
      "pilkades_calon", "pilkades_suara_tps", "pilkades_hasil", "pilkades_panitia", "pilkades_logo", "pilkades_log",
    ].map((t) => hitung(supabase, t, periode.id)));
    ringkas = { pemilih, tps, arsip, tambahan, hadir, calon, rekapTps, hasil, panitia, logo, riwayat };
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <JudulHalaman
        judul={`Jadwal Tahapan — ${periode.nama}`}
        penjelasan="Atur tahapan sesuai aturan desa Anda: ganti nama, ubah urutan, tambah, atau hapus. Isi tanggal mulai (dan tanggal selesai bila lebih dari sehari). Tahap bertanda ⚙ selesai sendiri saat pekerjaannya tercatat di aplikasi."
      />

      <PesanSekali pesan={pesanDari(PESAN_HASIL, sp)} />
      <Catatan
        butir={[
          j.error && { jenis: "bahaya", judul: "Jadwal gagal dimuat", isi: `Muat ulang halaman ini.${teknis(role, "0062")}` },
          urutan.length > 0 && {
            jenis: "perhatian",
            judul: "Periksa urutan tanggal",
            isi: urutan.join(" "),
          },
        ]}
      />

      {bisaUbah ? (
        <FormJadwal
          key={JSON.stringify(awal)}
          periodeId={periode.id}
          awal={awal}
          tanggalPemungutan={periode.tanggal_pemungutan}
          adminTautan={isAdminRole(role)}
        />
      ) : (
        <Kartu>
          <h2 className="text-base font-bold text-sky-950">Jadwal saat ini</h2>
          <p className="mb-3 text-sm text-slate-600">Jadwal diisi oleh Panitia Pilkades.</p>
          <GarisWaktu tahap={j.tahap} />
        </Kartu>
      )}

      {bisaUbah && <TombolResetTahapan periodeId={periode.id} tahap={awal} tersimpan={j.tersimpan} ringkas={ringkas} />}

      <Kartu>
        <h2 className="text-base font-bold text-sky-950">Cetak jadwal tahapan</h2>
        <p className="mt-1 text-sm text-slate-700">Dicetak di kertas A4 dengan margin kecil, siap ditempel di papan pengumuman.</p>
        <form action="/cetak/pilkades/jadwal" target="_blank" className="mt-3 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <input type="checkbox" name="status" value="1" className="h-5 w-5" />
            Sertakan kolom status (selesai / berlangsung / akan datang)
          </label>
          <button className={tombol.sekunder}>Buka Pratinjau Cetak</button>
        </form>
        {bisaUbah && <p className="mt-2 text-sm text-slate-600">Jadwal yang dicetak adalah jadwal yang sudah disimpan. Simpan dulu bila ada perubahan.</p>}
      </Kartu>

      <p className="text-sm text-slate-600">
        Hasilnya tampil sebagai progres dan garis waktu di{" "}
        <Link href="/dashboard/pilkades" className="font-bold text-sky-800 underline">beranda Pilkades</Link>.
      </p>
    </div>
  );
}
