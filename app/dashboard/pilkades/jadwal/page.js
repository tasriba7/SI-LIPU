import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ambilRole } from "@/lib/akses";
import { bisaUbahPilkades, isAdminRole } from "@/lib/roles";
import { ambilPeriode } from "@/lib/pilkades";
import { ambilJadwalLengkap, periksaUrutan } from "@/lib/pilkadesJadwal";
import { pesanDari, teknis } from "@/lib/pilkadesPesan";
import PesanSekali from "@/components/pilkades/PesanSekali";
import { GarisWaktu } from "@/components/pilkades/GarisWaktu";
import { JudulHalaman, Catatan, Kartu, KosongPandu } from "@/components/pilkades/UI";
import FormJadwal from "./FormJadwal";

export const metadata = { title: "Jadwal Tahapan — Pilkades" };

const PESAN_HASIL = {
  ok: (sp) => ["sukses", "Jadwal tersimpan", `${sp.n} tahapan tersimpan. Progres dan garis waktu di beranda ikut diperbarui.`],
};

export default async function JadwalPage({ searchParams }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const periode = await ambilPeriode(supabase);
  const { role } = await ambilRole(supabase);
  const bisaUbah = bisaUbahPilkades(role);
  if (!periode) {
    return <KosongPandu judul="Belum ada periode Pilkades" href="/dashboard/pilkades/periode" label="Buka Periode Pilkades" />;
  }

  const j = await ambilJadwalLengkap(supabase, periode);
  const awal = j.tahap.map((t) => ({ jenis: t.jenis ?? "", nama: t.nama, arti: t.arti, mulai: t.mulai && t.jenis !== "pemungutan" ? t.mulai : "", selesai: t.selesai ?? "", catatan: t.catatan }));
  const urutan = periksaUrutan(j.tahap);

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

      <p className="text-sm text-slate-600">
        Hasilnya tampil sebagai progres dan garis waktu di{" "}
        <Link href="/dashboard/pilkades" className="font-bold text-sky-800 underline">beranda Pilkades</Link>.
      </p>
    </div>
  );
}
