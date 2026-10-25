import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ambilRole } from "@/lib/akses";
import { bisaUbahPilkades } from "@/lib/roles";
import { ambilPeriode, ambilLangkah, formatTanggal } from "@/lib/pilkades";
import { ambilJadwalLengkap } from "@/lib/pilkadesJadwal";
import { KartuProgres, GarisWaktu } from "@/components/pilkades/GarisWaktu";
import { DaftarLangkah } from "@/components/pilkades/PanduanLangkah";
import { JudulHalaman, KosongPandu, Kartu, tombol } from "@/components/pilkades/UI";
import { IconArrowRight } from "@/components/icons";

export const metadata = { title: "Mulai di Sini — Pilkades" };

// Sisa hari memakai hitungan WITA yang sama dengan kartu progres (j.ringkas.hMin),
// bukan jam server, supaya dua angka di halaman ini tidak pernah berbeda.
function sisaHari(hMin) {
  if (hMin === null || hMin === undefined) return null;
  if (hMin > 0) return `${hMin} hari lagi`;
  if (hMin === 0) return "Hari ini";
  return null;
}

// Setelah 6 langkah daftar pemilih selesai, arahkan panitia ke fase berikutnya
// berdasarkan data nyata (calon ditetapkan, hasil suara).
function fasePasca(data) {
  if (!data.calon) {
    return {
      judul: "Catat calon kepala desa",
      teks: "Daftar pemilih sudah ditetapkan. Berikutnya catat calon yang mendaftar, hasil verifikasi, dan nomor urut.",
      href: "/dashboard/pilkades/calon",
      tombol: "Buka Calon Kepala Desa",
    };
  }
  if (!data.hasil) {
    return {
      judul: "Hari pemungutan: daftar hadir & hasil suara",
      teks: "Catat pemilih yang hadir di TPS, lalu masukkan rekap suara tiap TPS dan tetapkan calon terpilih.",
      href: "/dashboard/pilkades/hadir",
      tombol: "Buka Daftar Hadir",
    };
  }
  return {
    judul: "Cetak berita acara hasil",
    teks: "Calon terpilih sudah ditetapkan. Berita acara bisa dicetak dari halaman Hasil Suara.",
    href: "/dashboard/pilkades/hasil",
    tombol: "Buka Hasil Suara & Berita Acara",
  };
}

export default async function BerandaPilkades() {
  const supabase = await createClient();
  const periode = await ambilPeriode(supabase);

  if (!periode) {
    return (
      <div className="mx-auto max-w-5xl">
        <KosongPandu
          judul="Belum ada periode Pilkades"
          teks="Administrator perlu membuat periode pemilihan lebih dulu, misalnya “Pilkades 2026”."
          href="/dashboard/pilkades/periode"
          label="Buka Periode Pilkades"
        />
      </div>
    );
  }

  const s = await ambilLangkah(supabase, periode);
  const j = await ambilJadwalLengkap(supabase, periode, { arsip: s.arsip });
  const { role } = await ambilRole(supabase);
  const bisaUbah = bisaUbahPilkades(role);
  const sisa = sisaHari(j.ringkas.hMin);
  const langkahSelesai = s.langkah.filter((l) => l.status === "selesai").length;
  const pasca = s.berikutnya ? null : fasePasca(j.data);
  const dps = s.arsip.find((a) => a.jenis === "DPS");
  const dpt = s.arsip.find((a) => a.jenis === "DPT");

  const angka = [
    ["Calon pemilih", s.total, "Semua warga yang diambil", "border-sky-200 bg-sky-50", "text-sky-800", null],
    ["Memenuhi syarat", s.memenuhi, "Berhak memilih", "border-emerald-200 bg-emerald-50", "text-emerald-800", null],
    ["Belum diperiksa", s.belum, "Perlu ditandai panitia", "border-amber-200 bg-amber-50", "text-amber-800", s.belum > 0 ? "/dashboard/pilkades/pemilih" : null],
    ["Perlu dicek", s.perluCek, "Datanya meragukan", "border-orange-200 bg-orange-50", "text-orange-800", s.perluCek > 0 ? "/dashboard/pilkades/pemilih" : null],
    ["Tidak memenuhi syarat", s.tidakMemenuhi, "Tidak ikut daftar", "border-slate-200 bg-slate-50", "text-slate-700", null],
    ["Belum punya TPS", s.tanpaTps, "Pemilih yang belum ditempatkan", "border-rose-200 bg-rose-50", "text-rose-800", s.tanpaTps > 0 ? "/dashboard/pilkades/tempatkan" : null],
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <JudulHalaman
        judul={periode.nama}
        penjelasan={`Pemungutan suara: ${formatTanggal(periode.tanggal_pemungutan)}${sisa ? ` (${sisa})` : ""}${
          periode.aktif ? "" : " · periode ini belum diaktifkan"
        }`}
      />

      {/* Progres pelaksanaan + ajakan mengisi jadwal */}
      <KartuProgres tahap={j.tahap} ringkas={j.ringkas} />
      {!j.adaJadwal && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-sky-300 bg-sky-50 p-4">
          <p className="min-w-0 flex-1 basis-64 text-sm text-slate-800">
            <b className="text-sky-950">Jadwal tahapan belum diisi.</b>{" "}
            {bisaUbah ? "Isi tanggal tiap tahapan agar progres dan garis waktu terlihat jelas." : "Jadwal akan tampil di sini setelah diisi oleh Panitia Pilkades."}
          </p>
          {bisaUbah && <Link href="/dashboard/pilkades/jadwal" className={tombol.utama}>Isi jadwal tahapan</Link>}
        </div>
      )}

      {/* Langkah berikutnya */}
      <div className="rounded-2xl bg-gradient-to-r from-sky-600 to-teal-500 p-6 text-white shadow-md">
        {s.berikutnya ? (
          <>
            <p className="text-sm font-bold uppercase tracking-wide text-sky-100">Langkah berikutnya</p>
            <p className="mt-1 text-xl font-bold md:text-2xl">
              {s.berikutnya.no}. {s.berikutnya.judul}
            </p>
            <p className="mt-2 max-w-2xl text-sm text-sky-50">{s.berikutnya.penjelasan}</p>
            <Link
              href={s.berikutnya.href}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-sky-800 shadow hover:bg-sky-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              Mulai: {s.berikutnya.tombol}
              <IconArrowRight className="h-5 w-5" />
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm font-bold uppercase tracking-wide text-sky-100">✓ Daftar pemilih selesai · Langkah berikutnya</p>
            <p className="mt-1 text-xl font-bold md:text-2xl">{pasca.judul}</p>
            <p className="mt-2 max-w-2xl text-sm text-sky-50">{pasca.teks}</p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                href={pasca.href}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-sky-800 shadow hover:bg-sky-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                {pasca.tombol}
                <IconArrowRight className="h-5 w-5" />
              </Link>
              <Link href="/dashboard/pilkades/cetak" className="text-sm font-bold text-white underline">
                Cetak daftar pemilih
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Garis waktu tahapan */}
      <section aria-labelledby="judul-garis-waktu">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <h2 id="judul-garis-waktu" className="text-lg font-bold text-sky-950">Jadwal tahapan Pilkades</h2>
          <Link href="/dashboard/pilkades/jadwal" className="text-sm font-bold text-sky-800 underline">
            {bisaUbah ? "Isi / ubah jadwal →" : "Lihat rincian →"}
          </Link>
        </div>
        <GarisWaktu tahap={j.tahap} />
      </section>

      {/* 6 langkah */}
      <section>
        <h2 className="mb-1 text-lg font-bold text-sky-950">Urutan kerja panitia: menyiapkan daftar pemilih</h2>
        <p className="mb-3 text-sm text-slate-600">
          <b className="text-emerald-700">{langkahSelesai}</b> dari {s.langkah.length} langkah selesai. Ini rincian tahap “Penyusunan Daftar Pemilih” sampai “Penetapan DPT” pada jadwal di atas; tahap calon, hari pemungutan, dan hasil suara dihitung di progres pelaksanaan.
        </p>
        <DaftarLangkah langkah={s.langkah} varian="lengkap" />
      </section>

      {/* Angka ringkas */}
      <section>
        <h2 className="mb-3 text-lg font-bold text-sky-950">Keadaan saat ini</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {angka.map(([label, n, ket, kotak, warna, href]) => {
            const isi = (
              <>
                <p className="text-sm font-semibold text-slate-800">{label}</p>
                <p className={`mt-1 text-2xl font-extrabold ${warna}`}>{n}</p>
                <p className="mt-1 text-sm text-slate-600">{ket}</p>
                {href && <p className="mt-2 text-sm font-bold text-sky-800 underline">Kerjakan →</p>}
              </>
            );
            return href ? (
              <Link key={label} href={href} className={`rounded-xl border p-4 transition hover:shadow ${kotak}`}>{isi}</Link>
            ) : (
              <div key={label} className={`rounded-xl border p-4 ${kotak}`}>{isi}</div>
            );
          })}
        </div>
      </section>

      {/* DPS & DPT */}
      <section className="grid gap-3 md:grid-cols-2">
        {[
          ["DPS", "Daftar Pemilih Sementara", "Diumumkan agar warga bisa menanggapi.", dps],
          ["DPT", "Daftar Pemilih Tetap", "Daftar final yang dipakai saat pemungutan suara.", dpt],
        ].map(([kode, nama, arti, a]) => (
          <Link
            key={kode}
            href={a ? `/dashboard/pilkades/daftar/${a.id}` : "/dashboard/pilkades/daftar"}
            className="rounded-xl border border-sky-100 bg-white p-5 transition hover:border-sky-300 hover:shadow"
          >
            <p className="text-sm font-bold text-sky-900">{kode} — {nama}</p>
            <p className="text-sm text-slate-600">{arti}</p>
            {a ? (
              <p className="mt-2 text-sm text-slate-900">
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-sm font-semibold text-emerald-800">✓ Sudah ditetapkan</span>{" "}
                Versi {a.versi} · {a.jumlah} pemilih · {formatTanggal(a.tanggal_penetapan)}
              </p>
            ) : (
              <p className="mt-2 text-sm font-medium text-slate-500">Belum ditetapkan</p>
            )}
          </Link>
        ))}
      </section>

      <Kartu className="bg-sky-50">
        <p className="text-base font-bold text-sky-950">Arti singkatan</p>
        <ul className="mt-2 space-y-1 text-sm text-slate-800">
          <li><b>TPS</b> — Tempat Pemungutan Suara, tempat warga mencoblos.</li>
          <li><b>DPS</b> — Daftar Pemilih Sementara, diumumkan lebih dulu agar warga bisa memeriksa namanya.</li>
          <li><b>DPT</b> — Daftar Pemilih Tetap, daftar final setelah tanggapan warga diperiksa.</li>
        </ul>
      </Kartu>
    </div>
  );
}
