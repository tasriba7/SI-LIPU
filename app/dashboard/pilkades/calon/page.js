import { createClient } from "@/lib/supabase/server";
import { ambilRole } from "@/lib/akses";
import { bisaUbahPilkades } from "@/lib/roles";
import { ambilPeriode, ambilCalon, STATUS_CALON, STATUS_CALON_BADGE } from "@/lib/pilkades";
import { simpanCalon, hapusCalon } from "../actions";
import TombolKonfirmasi from "@/components/pilkades/TombolKonfirmasi";
import { JudulHalaman, Pesan, Kartu, KosongPandu, tombol, kolom, labelKolom } from "@/components/pilkades/UI";

export const metadata = { title: "Calon Kepala Desa — Pilkades" };

const PESAN_HASIL = {
  nama: ["perhatian", "Nama terlalu pendek", "Tulis nama lengkap calon, minimal 3 huruf."],
  nomor: ["perhatian", "Nomor urut tidak valid", "Isi angka 1 sampai 99, atau kosongkan bila belum ada."],
  perlu_nomor: ["perhatian", "Nomor urut wajib untuk calon yang ditetapkan", "Isi nomor urut dulu, atau pilih status lain."],
  perlu_alasan: ["perhatian", "Alasan wajib diisi", "Calon yang tidak lolos harus disertai alasan (minimal 5 huruf)."],
  nomor_kembar: ["perhatian", "Nomor urut sudah dipakai", "Setiap calon dalam satu periode harus punya nomor urut berbeda."],
  terkunci: ["perhatian", "Calon yang sudah ditetapkan tidak bisa dihapus", "Ubah statusnya lebih dulu bila memang ada kesalahan, lalu hapus."],
  gagal: ["bahaya", "Gagal menyimpan", "Silakan coba lagi. Pastikan migrasi 0054 dan 0055 sudah dijalankan."],
};

function FormCalon({ periodeId, calon }) {
  return (
    <form action={simpanCalon} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="periode_id" value={periodeId} />
      {calon && <input type="hidden" name="id" value={calon.id} />}
      <label className={`${labelKolom} sm:col-span-2`}>
        Nama lengkap calon
        <input name="nama" required minLength={3} maxLength={100} defaultValue={calon?.nama ?? ""} placeholder="Nama lengkap, boleh beserta gelar" className={`${kolom} mt-1 font-normal`} />
      </label>
      <label className={labelKolom}>
        Nomor urut <span className="font-normal text-slate-600">(kosongkan bila belum diundi)</span>
        <input type="number" name="nomor_urut" min="1" max="99" defaultValue={calon?.nomor_urut ?? ""} className={`${kolom} mt-1 font-normal`} />
      </label>
      <label className={labelKolom}>
        Status
        <select name="status" defaultValue={calon?.status ?? "mendaftar"} className={`${kolom} mt-1 font-normal`}>
          {Object.entries(STATUS_CALON).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      <label className={`${labelKolom} sm:col-span-2`}>
        Alasan <span className="font-normal text-slate-600">(wajib bila “Tidak lolos”)</span>
        <input name="alasan" maxLength={300} defaultValue={calon?.alasan ?? ""} className={`${kolom} mt-1 font-normal`} />
      </label>
      <label className={`${labelKolom} sm:col-span-2`}>
        Visi dan misi <span className="font-normal text-slate-600">(boleh kosong)</span>
        <textarea name="visi_misi" rows={4} maxLength={2000} defaultValue={calon?.visi_misi ?? ""} className={`${kolom} mt-1 font-normal`} />
      </label>
      <div className="sm:col-span-2">
        <button className={calon ? tombol.sekunder : tombol.utama}>{calon ? "Simpan perubahan" : "+ Tambah calon"}</button>
      </div>
    </form>
  );
}

export default async function CalonPage({ searchParams }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const periode = await ambilPeriode(supabase);
  const { role } = await ambilRole(supabase);
  const bisaUbah = bisaUbahPilkades(role);
  if (!periode) {
    return <KosongPandu judul="Belum ada periode Pilkades" href="/dashboard/pilkades/periode" label="Buka Periode Pilkades" />;
  }

  const { data: calon, error } = await ambilCalon(supabase, periode.id);
  const ditetapkan = calon.filter((c) => c.status === "ditetapkan").length;
  const pesan = PESAN_HASIL[sp.hasil];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <JudulHalaman
        judul={`Calon Kepala Desa — ${periode.nama}`}
        penjelasan="Catat calon yang mendaftar, hasil verifikasi berkas, dan nomor urutnya. Alurnya: Mendaftar → Lolos verifikasi berkas → Ditetapkan sebagai calon (dengan nomor urut)."
      />

      {sp.hasil === "ok" && <Pesan jenis="sukses" judul="Tersimpan">{sp.nama ? `Data ${sp.nama} sudah disimpan.` : "Data calon disimpan."}</Pesan>}
      {sp.hasil === "hapus" && <Pesan jenis="sukses" judul="Calon dihapus" />}
      {pesan && <Pesan jenis={pesan[0]} judul={pesan[1]}>{pesan[2]}</Pesan>}
      {error && <Pesan jenis="bahaya" judul="Daftar calon gagal dimuat">Pastikan migrasi 0054 dan 0055 sudah dijalankan.</Pesan>}
      {!bisaUbah && <Pesan jenis="info">Data calon dikelola oleh Panitia Pilkades. Akun ini hanya dapat melihat.</Pesan>}

      <div className="grid grid-cols-3 gap-3">
        {[
          ["Seluruh pendaftar", calon.length, "border-sky-200 bg-sky-50 text-sky-800"],
          ["Ditetapkan", ditetapkan, "border-emerald-200 bg-emerald-50 text-emerald-800"],
          ["Tidak lolos", calon.filter((c) => c.status === "tidak_lolos").length, "border-slate-200 bg-slate-50 text-slate-700"],
        ].map(([label, n, gaya]) => (
          <div key={label} className={`rounded-2xl border-2 p-4 ${gaya}`}>
            <p className="text-base font-semibold text-slate-800">{label}</p>
            <p className="mt-1 text-4xl font-extrabold">{n}</p>
          </div>
        ))}
      </div>

      <section className="space-y-3">
        {calon.map((c) => (
          <Kartu key={c.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-3xl font-extrabold text-sky-900">
                  {c.nomor_urut ?? "–"}
                </span>
                <div>
                  <p className="text-xl font-bold text-slate-900">{c.nama}</p>
                  <span className={`mt-1 inline-block rounded-full px-3 py-0.5 text-sm font-semibold ${STATUS_CALON_BADGE[c.status]}`}>
                    {STATUS_CALON[c.status]}
                  </span>
                </div>
              </div>
              {bisaUbah && c.status !== "ditetapkan" && (
                <form action={hapusCalon}>
                  <input type="hidden" name="id" value={c.id} />
                  <TombolKonfirmasi
                    pesan={`Hapus calon ${c.nama}? Tindakan ini tercatat di Riwayat.`}
                    className="rounded-lg border-2 border-red-200 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50"
                  >
                    Hapus
                  </TombolKonfirmasi>
                </form>
              )}
            </div>
            {c.alasan && <p className="mt-3 text-base text-slate-700"><b>Alasan:</b> {c.alasan}</p>}
            {c.visi_misi && (
              <details className="mt-3">
                <summary className="cursor-pointer text-base font-semibold text-sky-800">Lihat visi dan misi</summary>
                <p className="mt-2 whitespace-pre-line text-base text-slate-800">{c.visi_misi}</p>
              </details>
            )}
            {bisaUbah && (
              <details className="mt-4 rounded-xl border-2 border-sky-100 p-4">
                <summary className="cursor-pointer text-base font-bold text-sky-900">Ubah data calon ini</summary>
                <div className="mt-4"><FormCalon periodeId={periode.id} calon={c} /></div>
              </details>
            )}
          </Kartu>
        ))}
        {!calon.length && !error && (
          <KosongPandu judul="Belum ada calon" teks={bisaUbah ? "Tambahkan calon pertama lewat formulir di bawah." : "Calon ditambahkan oleh Panitia Pilkades."} />
        )}
      </section>

      {bisaUbah && (
        <Kartu>
          <h2 className="mb-3 text-lg font-bold text-sky-950">{calon.length ? "Tambah calon lagi" : "Tambah calon pertama"}</h2>
          <FormCalon periodeId={periode.id} calon={null} />
        </Kartu>
      )}

      <p className="text-sm text-slate-600">
        Syarat dan tahapan pencalonan mengikuti peraturan daerah Anda; aplikasi ini hanya mencatat hasilnya. Setiap penambahan, perubahan, dan penghapusan tercatat di Riwayat Aktivitas.
      </p>
    </div>
  );
}
