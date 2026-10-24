import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ambilPeriode, ambilLangkah, formatTanggal } from "@/lib/pilkades";
import { DaftarLangkah } from "@/components/pilkades/PanduanLangkah";
import { JudulHalaman, KosongPandu, Kartu, tombol } from "@/components/pilkades/UI";
import { IconArrowRight } from "@/components/icons";

export const metadata = { title: "Mulai di Sini — Pilkades" };

function sisaHari(tanggal) {
  if (!tanggal) return null;
  const hari = Math.ceil((new Date(tanggal).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
  if (hari > 0) return `${hari} hari lagi`;
  if (hari === 0) return "Hari ini";
  return null;
}

export default async function BerandaPilkades() {
  const supabase = await createClient();
  const periode = await ambilPeriode(supabase);

  if (!periode) {
    return (
      <div className="mx-auto max-w-3xl">
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
  const sisa = sisaHari(periode.tanggal_pemungutan);
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

      {/* Langkah berikutnya */}
      <div className="rounded-3xl bg-gradient-to-r from-sky-600 to-teal-500 p-6 text-white shadow-md">
        {s.berikutnya ? (
          <>
            <p className="text-sm font-bold uppercase tracking-wide text-sky-100">Langkah berikutnya</p>
            <p className="mt-1 text-2xl font-extrabold md:text-3xl">
              {s.berikutnya.no}. {s.berikutnya.judul}
            </p>
            <p className="mt-2 max-w-2xl text-base text-sky-50">{s.berikutnya.penjelasan}</p>
            <Link
              href={s.berikutnya.href}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-lg font-bold text-sky-800 shadow hover:bg-sky-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
            >
              Mulai: {s.berikutnya.tombol}
              <IconArrowRight className="h-5 w-5" />
            </Link>
          </>
        ) : (
          <>
            <p className="text-2xl font-extrabold">🎉 Semua langkah sudah selesai</p>
            <p className="mt-2 text-base text-sky-50">Daftar pemilih sudah ditetapkan. Anda masih bisa mencetaknya kapan saja.</p>
            <Link href="/dashboard/pilkades/cetak" className="mt-5 inline-flex rounded-xl bg-white px-6 py-3.5 text-lg font-bold text-sky-800 hover:bg-sky-50">
              Cetak Daftar
            </Link>
          </>
        )}
      </div>

      {/* 6 langkah */}
      <section>
        <h2 className="mb-3 text-xl font-bold text-sky-950">Urutan kerja panitia</h2>
        <DaftarLangkah langkah={s.langkah} varian="lengkap" />
      </section>

      {/* Angka ringkas */}
      <section>
        <h2 className="mb-3 text-xl font-bold text-sky-950">Keadaan saat ini</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {angka.map(([label, n, ket, kotak, warna, href]) => {
            const isi = (
              <>
                <p className="text-base font-semibold text-slate-800">{label}</p>
                <p className={`mt-1 text-4xl font-extrabold ${warna}`}>{n}</p>
                <p className="mt-1 text-sm text-slate-600">{ket}</p>
                {href && <p className="mt-2 text-sm font-bold text-sky-800 underline">Kerjakan →</p>}
              </>
            );
            return href ? (
              <Link key={label} href={href} className={`rounded-2xl border-2 p-4 transition hover:shadow ${kotak}`}>{isi}</Link>
            ) : (
              <div key={label} className={`rounded-2xl border-2 p-4 ${kotak}`}>{isi}</div>
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
            className="rounded-2xl border-2 border-sky-100 bg-white p-5 transition hover:border-sky-300 hover:shadow"
          >
            <p className="text-base font-bold text-sky-900">{kode} — {nama}</p>
            <p className="text-sm text-slate-600">{arti}</p>
            {a ? (
              <p className="mt-2 text-base text-slate-900">
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-sm font-semibold text-emerald-800">✓ Sudah ditetapkan</span>{" "}
                Versi {a.versi} · {a.jumlah} pemilih · {formatTanggal(a.tanggal_penetapan)}
              </p>
            ) : (
              <p className="mt-2 text-base font-medium text-slate-500">Belum ditetapkan</p>
            )}
          </Link>
        ))}
      </section>

      <Kartu className="bg-sky-50">
        <p className="text-lg font-bold text-sky-950">Arti singkatan</p>
        <ul className="mt-2 space-y-1 text-base text-slate-800">
          <li><b>TPS</b> — Tempat Pemungutan Suara, tempat warga mencoblos.</li>
          <li><b>DPS</b> — Daftar Pemilih Sementara, diumumkan lebih dulu agar warga bisa memeriksa namanya.</li>
          <li><b>DPT</b> — Daftar Pemilih Tetap, daftar final setelah tanggapan warga diperiksa.</li>
        </ul>
      </Kartu>
    </div>
  );
}
