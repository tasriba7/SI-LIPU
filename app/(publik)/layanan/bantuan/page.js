import Link from "next/link";
import { IconHeartHandshake, IconSearch } from "@/components/icons";
import {
  UKURAN_HALAMAN_BANTUAN,
  ambilDaftarPenerimaBantuan,
  ambilRingkasanBantuan,
} from "@/lib/bantuanPublik";
import {
  KATEGORI_BADGE_CLASS,
  KATEGORI_LABEL,
  labelPeriode,
  labelWilayahWarga,
} from "@/lib/bantuan";

// Data berubah saat admin menampilkan/menyembunyikan penerima: jangan di-cache.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Cek Penerima Bantuan",
  // Daftar nama warga tidak untuk diindeks mesin pencari.
  robots: { index: false, follow: false },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function buatUrl({ jenis, periode, cari, hal }) {
  const q = new URLSearchParams();
  if (jenis) q.set("jenis", jenis);
  if (jenis) q.set("periode", periode ?? "");
  if (cari) q.set("cari", cari);
  if (hal && hal > 1) q.set("hal", String(hal));
  const str = q.toString();
  return `/layanan/bantuan${str ? `?${str}` : ""}`;
}

export default async function CekBantuanPage({ searchParams }) {
  const sp = await searchParams;
  const ringkasan = await ambilRingkasanBantuan();

  const jenisParam = typeof sp?.jenis === "string" && UUID_RE.test(sp.jenis) ? sp.jenis : "";
  const periodeParam = typeof sp?.periode === "string" ? sp.periode.slice(0, 60) : null;
  const cari = (typeof sp?.cari === "string" ? sp.cari : "").replace(/\s+/g, " ").trim().slice(0, 60);
  const hal = Math.max(1, parseInt(sp?.hal, 10) || 1);

  const programTerpilih = jenisParam
    ? ringkasan.find(
        (p) => p.jenis_id === jenisParam && (periodeParam === null || p.periode === periodeParam)
      )
    : null;

  const cariTerlaluPendek = cari.length > 0 && cari.length < 3;
  let daftar = null;
  if (programTerpilih) {
    daftar = await ambilDaftarPenerimaBantuan({
      jenisId: programTerpilih.jenis_id,
      periode: programTerpilih.periode,
      cari: cariTerlaluPendek ? "" : cari,
      halaman: hal,
    });
  }

  const total = daftar?.total ?? 0;
  const jumlahHalaman = Math.max(1, Math.ceil(total / UKURAN_HALAMAN_BANTUAN));
  const dari = total === 0 ? 0 : (hal - 1) * UKURAN_HALAMAN_BANTUAN + 1;
  const sampai = Math.min(hal * UKURAN_HALAMAN_BANTUAN, total);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy text-gold-light">
              <IconHeartHandshake className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-navy">Cek Penerima Bantuan</h1>
              <p className="mt-1 text-sm text-slate-500">
                Daftar warga penerima bantuan yang ditetapkan dan ditampilkan oleh pemerintah desa.
                Pilih jenis bantuan untuk melihat nama-namanya.
              </p>
            </div>
          </div>

          {/* Belum ada data sama sekali */}
          {ringkasan.length === 0 && (
            <p className="mt-8 rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-400">
              Belum ada daftar penerima bantuan yang ditampilkan. Silakan cek kembali nanti atau
              tanyakan ke kantor desa.
            </p>
          )}

          {/* Pilih program */}
          {ringkasan.length > 0 && !programTerpilih && (
            <>
              {jenisParam && (
                <p className="mt-6 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Daftar bantuan yang Anda buka tidak ditemukan atau sudah tidak ditampilkan.
                </p>
              )}
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {ringkasan.map((p) => (
                  <li key={`${p.jenis_id}-${p.periode}`}>
                    <Link
                      href={buatUrl({ jenis: p.jenis_id, periode: p.periode })}
                      className="group block h-full rounded-xl border border-slate-200 p-4 transition hover:-translate-y-0.5 hover:border-gold hover:shadow-md"
                    >
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          KATEGORI_BADGE_CLASS[p.kategori] ?? KATEGORI_BADGE_CLASS.lainnya
                        }`}
                      >
                        {KATEGORI_LABEL[p.kategori] ?? p.kategori}
                      </span>
                      <p className="mt-2 font-semibold text-slate-800">{p.jenis_nama}</p>
                      <p className="text-xs text-slate-500">{labelPeriode(p.periode)}</p>
                      <p className="mt-2 text-xs font-medium text-navy">
                        {Number(p.jumlah).toLocaleString("id-ID")} penerima &rarr;
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Daftar nama */}
          {programTerpilih && (
            <div className="mt-6">
              <Link href="/layanan/bantuan" className="text-xs text-slate-400 hover:text-slate-600">
                &larr; Semua jenis bantuan
              </Link>
              <h2 className="mt-1 text-lg font-semibold text-slate-800">
                {programTerpilih.jenis_nama}
              </h2>
              <p className="text-sm text-slate-500">{labelPeriode(programTerpilih.periode)}</p>

              {/* Pencarian nama: dipicu tombol, bukan otomatis saat mengetik */}
              <form action="/layanan/bantuan" className="mt-4 flex gap-2">
                <input type="hidden" name="jenis" value={programTerpilih.jenis_id} />
                <input type="hidden" name="periode" value={programTerpilih.periode} />
                <div className="relative min-w-0 flex-1">
                  <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    name="cari"
                    defaultValue={cari}
                    maxLength={60}
                    placeholder="Cari nama (minimal 3 huruf)"
                    className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-navy"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light"
                >
                  Cari
                </button>
              </form>
              {cariTerlaluPendek && (
                <p className="mt-2 text-xs text-amber-700">
                  Ketik minimal 3 huruf untuk mencari. Menampilkan seluruh daftar.
                </p>
              )}
              {cari && !cariTerlaluPendek && (
                <p className="mt-2 text-xs text-slate-500">
                  Hasil pencarian &quot;{cari}&quot;.{" "}
                  <Link
                    href={buatUrl({
                      jenis: programTerpilih.jenis_id,
                      periode: programTerpilih.periode,
                    })}
                    className="font-medium text-navy hover:underline"
                  >
                    Tampilkan semua
                  </Link>
                </p>
              )}

              {daftar?.gagal ? (
                <p className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  Daftar belum bisa dimuat. Coba lagi beberapa saat lagi.
                </p>
              ) : daftar && daftar.baris.length === 0 ? (
                <p className="mt-5 rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-400">
                  {cari && !cariTerlaluPendek
                    ? "Nama tidak ditemukan dalam daftar ini."
                    : "Belum ada nama yang ditampilkan untuk bantuan ini."}
                </p>
              ) : (
                <>
                  <p className="mt-5 text-xs text-slate-400">
                    Menampilkan {dari}&ndash;{sampai} dari {total.toLocaleString("id-ID")} nama
                  </p>
                  <ol
                    start={dari}
                    className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200"
                  >
                    {daftar?.baris.map((b, i) => (
                      <li
                        key={`${dari + i}-${b.nama_lengkap}`}
                        className="flex items-baseline gap-3 px-4 py-2.5"
                      >
                        <span className="w-7 shrink-0 text-right text-xs tabular-nums text-slate-300">
                          {dari + i}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800">{b.nama_lengkap}</p>
                          <p className="text-xs text-slate-400">{labelWilayahWarga(b)}</p>
                        </div>
                      </li>
                    ))}
                  </ol>

                  {jumlahHalaman > 1 && (
                    <nav
                      aria-label="Halaman daftar"
                      className="mt-4 flex items-center justify-between text-sm"
                    >
                      {hal > 1 ? (
                        <Link
                          href={buatUrl({
                            jenis: programTerpilih.jenis_id,
                            periode: programTerpilih.periode,
                            cari: cariTerlaluPendek ? "" : cari,
                            hal: hal - 1,
                          })}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-600 hover:bg-slate-50"
                        >
                          &larr; Sebelumnya
                        </Link>
                      ) : (
                        <span />
                      )}
                      <span className="text-xs text-slate-400">
                        Halaman {hal} dari {jumlahHalaman}
                      </span>
                      {hal < jumlahHalaman ? (
                        <Link
                          href={buatUrl({
                            jenis: programTerpilih.jenis_id,
                            periode: programTerpilih.periode,
                            cari: cariTerlaluPendek ? "" : cari,
                            hal: hal + 1,
                          })}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-600 hover:bg-slate-50"
                        >
                          Berikutnya &rarr;
                        </Link>
                      ) : (
                        <span />
                      )}
                    </nav>
                  )}
                </>
              )}
            </div>
          )}

          <p className="mt-8 rounded-lg bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-500">
            Daftar ini memuat nama yang ditetapkan pemerintah desa untuk ditampilkan. Jika ada nama
            yang keliru atau Anda merasa berhak tetapi belum terdaftar, silakan hubungi kantor desa.
          </p>
        </div>

        <Link
          href="/"
          className="mt-6 block text-center text-xs text-slate-400 hover:text-slate-600"
        >
          Kembali ke beranda
        </Link>
      </div>
    </main>
  );
}
