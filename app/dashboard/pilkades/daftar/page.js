import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ambilRole } from "@/lib/akses";
import { bisaUbahPilkades } from "@/lib/roles";
import { ambilPeriode, ambilLangkah, formatTanggal, JENIS_DAFTAR_LABEL } from "@/lib/pilkades";
import FormTetapkan from "./FormTetapkan";
import { DaftarLangkah } from "@/components/pilkades/PanduanLangkah";
import { JudulHalaman, Kartu, KosongPandu, tombol } from "@/components/pilkades/UI";

export const metadata = { title: "Tetapkan DPS & DPT" };

export default async function DaftarPage() {
  const supabase = await createClient();
  const periode = await ambilPeriode(supabase);
  const { role } = await ambilRole(supabase);
  const bisaUbah = bisaUbahPilkades(role);
  if (!periode) {
    return <KosongPandu judul="Belum ada periode Pilkades" href="/dashboard/pilkades/periode" label="Buka Periode Pilkades" />;
  }

  const s = await ambilLangkah(supabase, periode);
  const { data: arsipLengkap } = await supabase
    .from("pilkades_daftar_tetap")
    .select("id, jenis, versi, tanggal_penetapan, nomor_berita_acara, jumlah, ditetapkan_oleh_nama")
    .eq("periode_id", periode.id)
    .order("created_at", { ascending: false });
  const arsip = arsipLengkap ?? [];
  const berlaku = {};
  for (const a of arsip) if (!berlaku[a.jenis]) berlaku[a.jenis] = a.id; // terbaru dulu

  // DPS terkunci sampai syarat terpenuhi; DPT terkunci sampai ada DPS.
  // (Ingin melonggarkan? Ubah `s.alasanTetapkan` di bawah menjadi `null` untuk DPS.)
  const alasanDps = s.alasanTetapkan;
  const tautanDps = s.memenuhi === 0
    ? { href: "/dashboard/pilkades/pemilih", label: "Ke Langkah 2: Periksa Pemilih" }
    : s.jumlahTps === 0
      ? { href: "/dashboard/pilkades/tps", label: "Ke Langkah 3: Atur TPS" }
      : { href: "/dashboard/pilkades/tempatkan", label: "Ke Langkah 4: Tempatkan Pemilih" };
  const alasanDpt = alasanDps ?? (s.adaDps ? null : "DPT hanya bisa ditetapkan setelah DPS ditetapkan. Tetapkan DPS dulu.");

  const syarat = [
    [s.memenuhi > 0, `${s.memenuhi} pemilih berstatus “Memenuhi syarat”`, "/dashboard/pilkades/pemilih"],
    [s.jumlahTps > 0, s.jumlahTps > 0 ? `${s.jumlahTps} TPS sudah dibuat` : "Belum ada TPS", "/dashboard/pilkades/tps"],
    [s.tanpaTps === 0 && s.memenuhi > 0, s.tanpaTps === 0 ? "Semua pemilih sudah punya TPS" : `${s.tanpaTps} pemilih belum punya TPS`, "/dashboard/pilkades/tempatkan"],
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <DaftarLangkah langkah={s.langkah} aktif="tetapkan" />
      <JudulHalaman
        langkah={5}
        judul={`Tetapkan DPS lalu DPT — ${periode.nama}`}
        penjelasan="Menetapkan berarti menyalin pemilih yang “Memenuhi syarat” menjadi daftar resmi yang disimpan tetap. Urutannya: DPS dulu, lalu DPT."
      />

      <Kartu>
        <h2 className="text-base font-bold text-sky-950">Periksa dulu sebelum menetapkan</h2>
        <ul className="mt-2 space-y-2">
          {syarat.map(([ok, teks, href]) => (
            <li key={teks} className="flex flex-wrap items-center gap-3 text-sm">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-white ${ok ? "bg-emerald-500" : "bg-amber-500"}`}>{ok ? "✓" : "!"}</span>
              <span className="font-medium text-slate-900">{teks}</span>
              {!ok && <Link href={href} className="font-bold text-sky-800 underline">Perbaiki →</Link>}
            </li>
          ))}
          {(s.belum > 0 || s.perluCek > 0) && (
            <li className="flex flex-wrap items-center gap-3 text-sm">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-white">!</span>
              <span className="font-medium text-slate-900">
                {s.belum > 0 && `${s.belum} orang masih “Belum diperiksa”`}
                {s.belum > 0 && s.perluCek > 0 && " dan "}
                {s.perluCek > 0 && `${s.perluCek} orang “Perlu dicek”`}
                {" "}(tidak ikut masuk daftar)
              </span>
              <Link href="/dashboard/pilkades/pemilih" className="font-bold text-sky-800 underline">Periksa →</Link>
            </li>
          )}
        </ul>
      </Kartu>

      {bisaUbah && (
        <div className="grid gap-4 md:grid-cols-2">
          <FormTetapkan periodeId={periode.id} jenis="DPS" jumlah={s.memenuhi} nonaktifAlasan={alasanDps} tautan={tautanDps} />
          <FormTetapkan
            periodeId={periode.id}
            jenis="DPT"
            jumlah={s.memenuhi}
            nonaktifAlasan={alasanDpt}
            tautan={alasanDps ? tautanDps : s.adaDps ? null : { href: "#", label: "Tetapkan DPS di sebelah kiri dulu" }}
          />
        </div>
      )}

      <section>
        <h2 className="mb-2 text-lg font-bold text-sky-950">Daftar yang sudah ditetapkan</h2>
        <ul className="divide-y divide-sky-100 overflow-hidden rounded-xl border border-sky-100 bg-white shadow-sm">
          {arsip.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div>
                <p className="text-base font-bold text-slate-900">
                  {JENIS_DAFTAR_LABEL[a.jenis]} — versi {a.versi}
                  {berlaku[a.jenis] === a.id && (
                    <span className="ml-2 rounded-full bg-emerald-100 px-2.5 py-0.5 text-sm font-semibold text-emerald-800">✓ berlaku</span>
                  )}
                </p>
                <p className="text-sm text-slate-600">
                  Ditetapkan {formatTanggal(a.tanggal_penetapan)} · {a.jumlah} pemilih
                  {a.nomor_berita_acara && ` · BA ${a.nomor_berita_acara}`}
                  {a.ditetapkan_oleh_nama && ` · oleh ${a.ditetapkan_oleh_nama}`}
                </p>
              </div>
              <Link href={`/dashboard/pilkades/daftar/${a.id}`} className={tombol.sekunder}>Lihat & cetak</Link>
            </li>
          ))}
          {!arsip.length && <li className="px-5 py-8 text-center text-sm text-slate-500">Belum ada daftar yang ditetapkan.</li>}
        </ul>
      </section>

      {s.adaDps && (
        <div className="flex justify-end">
          <Link href="/dashboard/pilkades/cetak" className={tombol.utama}>Lanjut ke Langkah 6: Cetak Daftar →</Link>
        </div>
      )}
    </div>
  );
}
