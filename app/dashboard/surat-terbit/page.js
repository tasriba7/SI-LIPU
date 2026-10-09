import Link from "next/link";
import Form from "next/form";
import { createClient } from "@/lib/supabase/server";
import { formatTanggalId } from "@/lib/suratTemplate";
import { bisaTerbitkanSurat } from "@/lib/roles";

const BATAS_TAMPIL = 200;

/** Huruf kecil, tanpa aksen, spasi ganda dirapikan — supaya pencarian toleran. */
function normalisasi(teks) {
  return String(teks ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Kumpulkan semua nilai teks dari biodata (aman untuk data yang bentuknya tak terduga). */
function teksBiodata(isi) {
  const gabung = (daftar) =>
    (Array.isArray(daftar) ? daftar : [])
      .map((b) => (b && typeof b === "object" ? `${b.label ?? ""} ${b.value ?? ""}` : String(b ?? "")))
      .join(" ");
  return `${gabung(isi?.biodata)} ${gabung(isi?.biodata2)}`;
}

export default async function SuratTerbitPage({ searchParams }) {
  const sp = await searchParams;
  // q bisa berupa array bila parameter muncul dua kali di URL.
  const q = String(Array.isArray(sp?.q) ? sp.q[0] : sp?.q ?? "").slice(0, 80);
  const kata = normalisasi(q);
  const kataKunci = kata.split(" ").filter(Boolean);

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profil } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  const bolehBuatSurat = bisaTerbitkanSurat(profil?.role);

  const { data, error } = await supabase
    .from("surat_terbit")
    .select(
      "id, nomor_surat, tanggal_surat, isi, pengajuan_id, pengajuan_surat_id, pengajuan_layanan(kode_tracking, nama_pemohon), pengajuan_surat(kode_tracking, nama_pemohon)"
    )
    .order("tanggal_surat", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(BATAS_TAMPIL);

  // Sumber surat: pengajuan baru (layanan) atau lama (surat).
  const semua = (data || []).map((s) => ({
    ...s,
    pengajuan:
      [s.pengajuan_layanan, s.pengajuan_surat]
        .map((x) => (Array.isArray(x) ? x[0] : x))
        .find(Boolean) || {},
  }));
  const daftar = kataKunci.length
    ? semua.filter((s) => {
        const teks = normalisasi(
          [
            s.nomor_surat,
            s.isi?.judul,
            s.pengajuan.nama_pemohon,
            s.pengajuan.kode_tracking,
            teksBiodata(s.isi),
          ].join(" ")
        );
        // Setiap kata yang diketik harus ada (urutan bebas).
        return kataKunci.every((k) => teks.includes(k));
      })
    : semua;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Surat Terbit</h1>
          <p className="text-sm text-slate-500">
            Arsip surat yang sudah diterbitkan. Cetak ulang memakai salinan final, jadi isinya
            sama persis dengan saat diterbitkan.
          </p>
        </div>
        {bolehBuatSurat && (
          <Link
            href="/dashboard/layanan/buat"
            className="shrink-0 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light"
          >
            + Buat Surat Langsung
          </Link>
        )}
      </div>

      <Form className="flex gap-2" action="/dashboard/surat-terbit">
        <input
          name="q"
          defaultValue={q}
          placeholder="Cari nomor surat, nama, atau kode pengajuan..."
          className="w-full max-w-md rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-navy focus:outline-none"
        />
        <button className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light">
          Cari
        </button>
        {kataKunci.length > 0 && (
          <Link href="/dashboard/surat-terbit" className="px-2 py-2 text-sm text-slate-400 hover:text-slate-600">
            Reset
          </Link>
        )}
      </Form>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Data surat belum bisa dimuat: {error.message}
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3">Nomor</th>
              <th className="px-4 py-3">Jenis surat</th>
              <th className="px-4 py-3">Pemohon</th>
              <th className="px-4 py-3">Tanggal</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {daftar.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 font-mono text-xs text-slate-700">{s.nomor_surat}</td>
                <td className="px-4 py-3 text-slate-700">{s.isi?.judul}</td>
                <td className="px-4 py-3">
                  <p className="text-slate-700">{s.pengajuan.nama_pemohon}</p>
                  <p className="font-mono text-[11px] text-slate-400">
                    {s.pengajuan.kode_tracking}
                  </p>
                </td>
                <td className="px-4 py-3 text-slate-500">{formatTanggalId(s.tanggal_surat)}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/dashboard/surat-terbit/${s.id}`}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-navy hover:text-navy"
                  >
                    Lihat / Cetak
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {daftar.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-slate-400">
            {kataKunci.length ? "Tidak ada surat yang cocok." : "Belum ada surat yang diterbitkan."}
          </p>
        )}
      </div>
      {semua.length >= BATAS_TAMPIL && (
        <p className="text-xs text-slate-400">
          Menampilkan {BATAS_TAMPIL} surat terbaru. Pencarian hanya mencakup yang tampil.
        </p>
      )}
    </div>
  );
}
