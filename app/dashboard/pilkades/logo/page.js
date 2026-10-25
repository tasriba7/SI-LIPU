import { createClient } from "@/lib/supabase/server";
import { ambilRole } from "@/lib/akses";
import { bisaUbahPilkades } from "@/lib/roles";
import { ambilPeriode, ambilLogoPanitia, formatTanggal, EKSTENSI_LOGO, MAKS_LOGO_MB } from "@/lib/pilkades";
import { simpanLogoPanitia } from "../actions";
import TombolKonfirmasi from "@/components/pilkades/TombolKonfirmasi";
import { JudulHalaman, Kartu, KosongPandu, tombol } from "@/components/pilkades/UI";
import PesanSekali from "@/components/pilkades/PesanSekali";
import { pesanDari, COBA_LAGI } from "@/lib/pilkadesPesan";

export const metadata = { title: "Logo Panitia — Pilkades" };

const PESAN_HASIL = {
  ok: ["sukses", "Logo tersimpan", "Logo sekarang tampil di kop Daftar Pemilih dan Berita Acara."],
  hapus: ["sukses", "Logo dihapus", "Dokumen cetak kembali tanpa logo."],
  kosong: ["perhatian", "Belum ada berkas dipilih", "Pilih gambar logo dulu."],
  format: ["perhatian", "Format tidak didukung", "Gunakan gambar PNG, JPG, atau WEBP."],
  besar: ["perhatian", `Ukuran terlalu besar`, `Ukuran logo maksimal ${MAKS_LOGO_MB} MB.`],
  gagal: ["bahaya", "Gagal menyimpan", COBA_LAGI],
};

export default async function LogoPanitiaPage({ searchParams }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const periode = await ambilPeriode(supabase);
  const { role } = await ambilRole(supabase);
  const bisaUbah = bisaUbahPilkades(role);
  if (!periode) {
    return <KosongPandu judul="Belum ada periode Pilkades" href="/dashboard/pilkades/periode" label="Buka Periode Pilkades" />;
  }
  const logo = await ambilLogoPanitia(supabase, periode.id);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <JudulHalaman
        judul={`Logo Panitia — ${periode.nama}`}
        penjelasan="Logo ini otomatis tampil di sebelah kiri kop dokumen cetak panitia: Daftar Pemilih (DPS/DPT) dan Berita Acara Hasil Pemilihan. Satu logo untuk satu periode."
      />
      <PesanSekali pesan={pesanDari(PESAN_HASIL, sp)} />

      <Kartu>
        <h2 className="text-base font-bold text-sky-950">Logo saat ini</h2>
        {logo ? (
          <div className="mt-3 flex flex-wrap items-center gap-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo.url} alt="Logo panitia" className="h-28 w-28 rounded-xl border border-slate-200 bg-white object-contain p-2" />
            <p className="text-sm text-slate-600">
              Terakhir diubah {formatTanggal(logo.diubahPada)}{logo.diubahOleh ? ` oleh ${logo.diubahOleh}` : ""}.
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-700">Belum ada logo. Dokumen dicetak tanpa logo.</p>
        )}
      </Kartu>

      {bisaUbah && (
        <Kartu>
          <h2 className="text-base font-bold text-sky-950">{logo ? "Ganti logo" : "Unggah logo"}</h2>
          <form action={simpanLogoPanitia} className="mt-3 space-y-4">
            <input type="hidden" name="periode_id" value={periode.id} />
            <input
              type="file" name="logo" required accept="image/png,image/jpeg,image/webp"
              className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-sky-900"
            />
            <p className="text-sm text-slate-600">
              Format {EKSTENSI_LOGO.map((e) => e.toUpperCase()).join(", ")}, maksimal {MAKS_LOGO_MB} MB. Paling bagus berbentuk persegi dan berlatar transparan (PNG).
            </p>
            <button className={tombol.utama}>{logo ? "Ganti logo" : "Unggah logo"}</button>
          </form>
          {logo && (
            <form action={simpanLogoPanitia} className="mt-4 border-t border-slate-100 pt-4">
              <input type="hidden" name="periode_id" value={periode.id} />
              <input type="hidden" name="hapus" value="1" />
              <TombolKonfirmasi pesan="Hapus logo panitia? Dokumen cetak berikutnya tanpa logo." className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">
                Hapus logo
              </TombolKonfirmasi>
            </form>
          )}
        </Kartu>
      )}
    </div>
  );
}
