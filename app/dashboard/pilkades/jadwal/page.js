import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ambilRole } from "@/lib/akses";
import { bisaUbahPilkades, isAdminRole } from "@/lib/roles";
import { ambilPeriode } from "@/lib/pilkades";
import { ambilJadwalLengkap, periksaUrutan, TAHAP_BISA_DIISI } from "@/lib/pilkadesJadwal";
import { pesanDari, teknis } from "@/lib/pilkadesPesan";
import PesanSekali from "@/components/pilkades/PesanSekali";
import { GarisWaktu } from "@/components/pilkades/GarisWaktu";
import { JudulHalaman, Catatan, Kartu, KosongPandu } from "@/components/pilkades/UI";
import FormJadwal from "./FormJadwal";

export const metadata = { title: "Jadwal Tahapan — Pilkades" };

const PESAN_HASIL = {
  ok: (sp) => ["sukses", "Jadwal tersimpan", Number(sp.n) > 0 ? `${sp.n} tahapan sudah ada tanggalnya. Garis waktu di beranda ikut diperbarui.` : "Semua tanggal dikosongkan."],
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
  const awal = Object.fromEntries(j.tahap.map((t) => [t.kunci, { mulai: t.mulai ?? "", selesai: t.selesai ?? "", catatan: t.catatan }]));
  const baris = j.tahap.filter((t) => TAHAP_BISA_DIISI.some((x) => x.kunci === t.kunci));
  const pemungutan = j.tahap.find((t) => t.kunci === "pemungutan");
  const urutan = periksaUrutan(j.tahap);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <JudulHalaman
        judul={`Jadwal Tahapan — ${periode.nama}`}
        penjelasan="Isi tanggal mulai (dan tanggal selesai bila lebih dari sehari) untuk tiap tahapan. Tahapan yang dikosongkan tampil sebagai “belum dijadwalkan”. Semua tanggal bisa diubah kapan saja."
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
          periodeId={periode.id}
          baris={baris}
          awal={awal}
          pemungutan={pemungutan}
          tautanPeriode={isAdminRole(role)}
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
