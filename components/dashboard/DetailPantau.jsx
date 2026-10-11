import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABELS, STATUS_BADGE_CLASS } from "@/lib/statusSurat";
import { formatWaktu, lamaPenanganan } from "@/lib/pantauLayanan";

/**
 * Detail pengajuan / pengaduan MODE LIHAT untuk Anggota BPD, lengkap dengan
 * alur penanganan desa. Sumber: view `pengajuan_layanan_pantau` (tanpa NIK &
 * No. HP). Tidak ada formulir ubah status.
 *
 * Catatan: sistem menyimpan status terkini + catatan petugas + siapa/kapan
 * terakhir memperbarui, bukan riwayat tiap perubahan status. Alur di bawah
 * dibuat dari data itu.
 */
export default async function DetailPantau({ id }) {
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("pengajuan_layanan_pantau")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!p) notFound();

  const final = p.status === "selesai" || p.status === "ditolak";
  const sudahDisentuh = p.status !== "diajukan";
  const langkah = [
    {
      judul: "Diajukan oleh warga",
      waktu: p.created_at,
      aktif: true,
      keterangan: "Pengajuan masuk ke sistem.",
    },
    {
      judul: "Diproses desa",
      waktu: sudahDisentuh ? p.updated_at : null,
      aktif: sudahDisentuh,
      keterangan: sudahDisentuh
        ? p.diproses_oleh_nama
          ? `Ditangani oleh ${p.diproses_oleh_nama}.`
          : "Sudah ditangani petugas desa."
        : "Belum disentuh petugas.",
    },
    {
      judul: p.status === "ditolak" ? "Ditolak" : "Selesai",
      waktu: final ? p.updated_at : null,
      aktif: final,
      ditolak: p.status === "ditolak",
      keterangan: final ? "Penanganan ditutup." : "Belum selesai.",
    },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href={p.kategori === "pengaduan" ? "/dashboard/pengaduan" : "/dashboard/layanan"}
        className="text-sm text-slate-400 hover:text-slate-600"
      >
        &larr; Kembali ke daftar
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-xs text-slate-400">{p.kode_tracking}</p>
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[p.status]}`}>
            {STATUS_LABELS[p.status]}
          </span>
        </div>
        <h1 className="mt-1 text-lg font-bold text-slate-800">{p.nama_layanan}</h1>
        <p className="mt-1 inline-block rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">
          Mode lihat — NIK dan No. HP pemohon tidak ditampilkan
        </p>

        <dl className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-400">Pemohon</dt>
            <dd className="text-slate-700">
              {p.anonim ? (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                  Anonim
                </span>
              ) : (
                p.pemohon_samar || "-"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">Lama penanganan</dt>
            <dd className="text-slate-700">
              {lamaPenanganan(p)}
              {!final && <span className="ml-1 text-xs text-slate-400">(masih berjalan)</span>}
            </dd>
          </div>
          {p.jenis_pengaduan && (
            <div className="sm:col-span-2">
              <dt className="text-slate-400">Jenis pengaduan</dt>
              <dd className="text-slate-700">{p.jenis_pengaduan}</dd>
            </div>
          )}
          {p.isi_pengaduan && (
            <div className="sm:col-span-2">
              <dt className="text-slate-400">Isi pengaduan</dt>
              <dd className="whitespace-pre-wrap text-slate-700">{p.isi_pengaduan}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-bold text-slate-800">Proses penanganan desa</h2>
        <ol className="mt-4 space-y-5">
          {langkah.map((l, i) => (
            <li key={l.judul} className="flex gap-3">
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  !l.aktif
                    ? "bg-slate-100 text-slate-300"
                    : l.ditolak
                      ? "bg-red-100 text-red-700"
                      : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {i + 1}
              </span>
              <div>
                <p className={`text-sm font-medium ${l.aktif ? "text-slate-800" : "text-slate-400"}`}>
                  {l.judul}
                </p>
                {l.waktu && <p className="text-xs text-slate-400">{formatWaktu(l.waktu)}</p>}
                <p className="text-xs text-slate-500">{l.keterangan}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-5 rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-medium text-slate-400">Catatan petugas desa</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
            {p.catatan_penanganan || "Belum ada catatan."}
          </p>
        </div>
      </div>
    </div>
  );
}
