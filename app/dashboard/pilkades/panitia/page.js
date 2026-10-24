import { createClient } from "@/lib/supabase/server";
import { ambilRole } from "@/lib/akses";
import { bisaUbahPilkades } from "@/lib/roles";
import { ambilPeriode, ambilSusunanPanitia, JABATAN_PANITIA, JABATAN_UTAMA, PENANDATANGAN_DOKUMEN } from "@/lib/pilkades";
import { simpanPanitia, hapusPanitia } from "../actions";
import TombolKonfirmasi from "@/components/pilkades/TombolKonfirmasi";
import { JudulHalaman, Pesan, Kartu, KosongPandu, tombol, kolom, labelKolom } from "@/components/pilkades/UI";

export const metadata = { title: "Susunan Panitia — Pilkades" };

const KETERANGAN = {
  ketua: "Menandatangani daftar pemilih dan dokumen resmi panitia.",
  sekretaris: "Menandatangani daftar pemilih bersama Ketua; mencatat berita acara.",
  bendahara: "Menandatangani dokumen keuangan panitia.",
};

export default async function SusunanPanitiaPage({ searchParams }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const periode = await ambilPeriode(supabase);
  const { role } = await ambilRole(supabase);
  const bisaUbah = bisaUbahPilkades(role);
  if (!periode) {
    return <KosongPandu judul="Belum ada periode Pilkades" href="/dashboard/pilkades/periode" label="Buka Periode Pilkades" />;
  }

  const susunan = await ambilSusunanPanitia(supabase, periode.id);
  const kosong = JABATAN_UTAMA.filter((j) => !susunan[j]);
  const dokumenDipakai = PENANDATANGAN_DOKUMEN.daftar_pemilih.map((j) => JABATAN_PANITIA[j]).join(" dan ");

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <JudulHalaman
        judul={`Susunan Panitia — ${periode.nama}`}
        penjelasan="Isi nama Ketua, Sekretaris, dan Bendahara. Anda tetap masuk dengan satu akun panitia; nama-nama ini otomatis dipakai pada kolom tanda tangan dokumen yang dicetak."
      />

      {sp.hasil === "ok" && (
        <Pesan jenis="sukses" judul="Tersimpan">
          {sp.nama ? `${sp.nama} tercatat sebagai ${JABATAN_PANITIA[sp.jabatan]?.toLowerCase() ?? "panitia"}.` : "Susunan panitia diperbarui."}
        </Pesan>
      )}
      {sp.hasil === "hapus" && <Pesan jenis="sukses" judul="Dihapus dari susunan panitia" />}
      {sp.hasil === "pendek" && <Pesan jenis="perhatian" judul="Nama terlalu pendek">Tulis nama lengkap, minimal 3 huruf.</Pesan>}
      {sp.hasil === "gagal" && (
        <Pesan jenis="bahaya" judul="Gagal menyimpan">
          {sp.pesan || "Silakan coba lagi. Pastikan migrasi 0059 sudah dijalankan."}
        </Pesan>
      )}
      {susunan.error && (
        <Pesan jenis="bahaya" judul="Susunan panitia gagal dimuat">
          Pastikan migrasi 0059 sudah dijalankan di Supabase.
        </Pesan>
      )}
      {!bisaUbah && <Pesan jenis="info">Susunan panitia diisi oleh Panitia Pilkades. Akun ini hanya dapat melihat.</Pesan>}
      {bisaUbah && !susunan.error && kosong.length > 0 && (
        <Pesan jenis="perhatian" judul="Belum lengkap">
          Belum diisi: {kosong.map((j) => JABATAN_PANITIA[j]).join(", ")}. Kolom tanda tangan pada cetakan akan dibiarkan kosong sampai nama diisi.
        </Pesan>
      )}

      <section className="space-y-3">
        {JABATAN_UTAMA.map((j) => {
          const orang = susunan[j];
          return (
            <Kartu key={j}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-sky-950">{JABATAN_PANITIA[j]}</h2>
                  <p className="text-sm text-slate-600">{KETERANGAN[j]}</p>
                </div>
                {orang ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">✓ Sudah diisi</span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">Belum diisi</span>
                )}
              </div>

              {bisaUbah ? (
                <form action={simpanPanitia} className="mt-3 flex flex-wrap items-end gap-3">
                  <input type="hidden" name="periode_id" value={periode.id} />
                  <input type="hidden" name="jabatan" value={j} />
                  <label className={`${labelKolom} min-w-0 flex-1 basis-64`}>
                    Nama lengkap {JABATAN_PANITIA[j]}
                    <input
                      name="nama"
                      required
                      minLength={3}
                      maxLength={100}
                      defaultValue={orang?.nama ?? ""}
                      placeholder="Nama lengkap, boleh beserta gelar"
                      className={`${kolom} mt-1 font-normal`}
                    />
                  </label>
                  <button className={orang ? tombol.sekunder : tombol.utama}>{orang ? "Ganti nama" : "Simpan"}</button>
                </form>
              ) : (
                <p className="mt-3 text-sm font-semibold text-slate-900">{orang?.nama ?? <span className="font-normal text-slate-500">Belum diisi</span>}</p>
              )}

              {bisaUbah && orang && (
                <form action={hapusPanitia} className="mt-2">
                  <input type="hidden" name="id" value={orang.id} />
                  <TombolKonfirmasi
                    pesan={`Kosongkan jabatan ${JABATAN_PANITIA[j]} (${orang.nama})?`}
                    className="text-sm font-semibold text-red-700 underline"
                  >
                    Kosongkan jabatan ini
                  </TombolKonfirmasi>
                </form>
              )}
            </Kartu>
          );
        })}
      </section>

      <Kartu>
        <h2 className="text-base font-bold text-sky-950">Anggota</h2>
        <p className="text-sm text-slate-600">Boleh lebih dari satu. Dicatat untuk kelengkapan susunan panitia.</p>

        <ul className="mt-3 divide-y divide-sky-100">
          {susunan.anggota.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
              <span className="text-sm font-medium text-slate-900">{a.nama}</span>
              {bisaUbah && (
                <form action={hapusPanitia}>
                  <input type="hidden" name="id" value={a.id} />
                  <TombolKonfirmasi
                    pesan={`Hapus ${a.nama} dari susunan panitia?`}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50"
                  >
                    Hapus
                  </TombolKonfirmasi>
                </form>
              )}
            </li>
          ))}
          {!susunan.anggota.length && <li className="py-3 text-sm text-slate-500">Belum ada anggota yang dicatat.</li>}
        </ul>

        {bisaUbah && (
          <form action={simpanPanitia} className="mt-3 flex flex-wrap items-end gap-3">
            <input type="hidden" name="periode_id" value={periode.id} />
            <input type="hidden" name="jabatan" value="anggota" />
            <label className={`${labelKolom} min-w-0 flex-1 basis-64`}>
              Tambah anggota
              <input name="nama" required minLength={3} maxLength={100} placeholder="Nama lengkap" className={`${kolom} mt-1 font-normal`} />
            </label>
            <button className={tombol.sekunder}>+ Tambah</button>
          </form>
        )}
      </Kartu>

      <Kartu className="bg-sky-50">
        <p className="text-base font-bold text-sky-950">Siapa yang tanda tangan di dokumen?</p>
        <ul className="mt-2 space-y-1 text-sm text-slate-800">
          <li><b>Daftar pemilih (DPS/DPT)</b> — {dokumenDipakai}.</li>
          <li className="text-slate-600">Dokumen lain (berita acara, laporan keuangan) akan memakai susunan ini juga saat modulnya ditambahkan.</li>
        </ul>
      </Kartu>
    </div>
  );
}
