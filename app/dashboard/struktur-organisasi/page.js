import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getStrukturAdmin, bangunPohon, hitungNode, inisialNama } from "@/lib/strukturOrganisasi";
import { IconPlus } from "@/components/icons";
import TombolAksiStruktur from "./TombolAksiStruktur";

// Satu baris jabatan + bawahannya (rekursif), diberi garis kiri sebagai penanda tingkat.
function Baris({ node, saudaraKe, jumlahSaudara, tingkat }) {
  return (
    <li className="relative">
      <div
        className={`flex flex-wrap items-center gap-4 rounded-2xl border bg-white p-3.5 ${
          node.aktif ? "border-slate-200" : "border-dashed border-slate-300 opacity-75"
        }`}
      >
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-royal to-royal-light text-sm font-bold text-white ring-2 ring-white shadow">
          {node.foto_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={node.foto_url} alt={node.nama} className="h-full w-full object-cover" />
          ) : (
            inisialNama(node.nama)
          )}
        </div>

        <div className="min-w-0 flex-1 basis-48">
          <p className="truncate font-medium text-slate-800">{node.nama}</p>
          <p className="truncate text-sm text-slate-500">{node.jabatan}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {tingkat === 0 && (
              <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-semibold text-navy-dark">Puncak bagan</span>
            )}
            {!node.aktif && (
              <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-semibold text-white">Disembunyikan</span>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex gap-3">
            <Link href={`/dashboard/struktur-organisasi/${node.id}/edit`} className="text-xs font-medium text-navy hover:underline">
              Edit
            </Link>
            <Link
              href={`/dashboard/struktur-organisasi/tambah?atasan=${node.id}`}
              className="text-xs font-medium text-navy hover:underline"
            >
              + Bawahan
            </Link>
          </div>
          <TombolAksiStruktur
            id={node.id}
            nama={node.nama}
            aktif={node.aktif}
            bisaKiri={saudaraKe > 0}
            bisaKanan={saudaraKe < jumlahSaudara - 1}
          />
        </div>
      </div>

      {node.anak.length > 0 && (
        <ul className="ml-5 mt-3 space-y-3 border-l-2 border-navy/20 pl-5 sm:ml-7 sm:pl-6">
          {node.anak.map((a, i) => (
            <Baris key={a.id} node={a} saudaraKe={i} jumlahSaudara={node.anak.length} tingkat={tingkat + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default async function StrukturAdminPage() {
  const supabase = await createClient();
  const semua = await getStrukturAdmin(supabase);
  const pohon = bangunPohon(semua);
  const jumlah = hitungNode(pohon);
  // Node yatim (atasannya hilang) tidak ikut pohon; beri tahu admin bila ada.
  const yatim = semua.length - jumlah;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Struktur Organisasi</h1>
          <p className="text-sm text-slate-500">
            Jabatan yang diisi di sini tampil sebagai bagan di beranda dan halaman Struktur Organisasi.
            Paling atas: Kepala Desa; tambahkan bawahan lewat tombol &quot;+ Bawahan&quot;.
          </p>
        </div>
        <Link
          href="/dashboard/struktur-organisasi/tambah"
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light"
        >
          <IconPlus className="h-4 w-4" />
          Tambah Jabatan
        </Link>
      </div>

      {yatim > 0 && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {yatim} jabatan tidak tampil karena atasannya tidak ditemukan. Buka Edit pada jabatan tersebut
          untuk memilih atasan yang benar.
        </p>
      )}

      {pohon.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-14 text-center">
          <p className="text-sm text-slate-400">
            Belum ada data. Klik &quot;Tambah Jabatan&quot; lalu mulai dari Kepala Desa (pilih &quot;Paling atas&quot;).
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {pohon.map((n, i) => (
            <Baris key={n.id} node={n} saudaraKe={i} jumlahSaudara={pohon.length} tingkat={0} />
          ))}
        </ul>
      )}
    </div>
  );
}
