import {
  IconBook,
  IconHeartHandshake,
  IconGenderBalance,
  IconCalendarRange,
  IconBriefcase,
} from "@/components/icons";

// Satu blok tabel rincian: judul + ikon di atas, baris label-bar-jumlah di
// bawah. Persentase dihitung relatif terhadap total baris di tabel itu
// sendiri (bukan total penduduk desa), supaya tetap akurat walau ada
// data warga yang belum lengkap (masuk kelompok "Belum Diisi").
function TabelKelompok({ icon: Icon, title, subtitle, data }) {
  const total = data.reduce((sum, row) => sum + row.jumlah, 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy/5 text-navy">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-display text-base font-semibold text-slate-800">
            {title}
          </h3>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>

      <div className="mt-5">
        {data.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            Data belum tersedia.
          </p>
        ) : (
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-50">
              {data.map((row) => {
                const persen = total > 0 ? (row.jumlah / total) * 100 : 0;
                return (
                  <tr key={row.label}>
                    <td className="py-2 pr-3 align-middle text-slate-600">
                      {row.label}
                    </td>
                    <td className="w-1/3 py-2 pr-3 align-middle">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gold"
                          style={{ width: `${Math.max(persen, row.jumlah > 0 ? 3 : 0)}%` }}
                        />
                      </div>
                    </td>
                    <td className="whitespace-nowrap py-2 text-right font-medium tabular-nums text-slate-800">
                      {row.jumlah.toLocaleString("id-ID")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function StatistikDetailBeranda({ detail }) {
  const {
    perAgama = [],
    perStatusKawin = [],
    perJenisKelamin = [],
    perRentangUsia = [],
    perPekerjaan = [],
  } = detail || {};

  const kosong =
    perAgama.length === 0 &&
    perStatusKawin.length === 0 &&
    perJenisKelamin.length === 0 &&
    perRentangUsia.length === 0 &&
    perPekerjaan.length === 0;

  if (kosong) return null;

  return (
    <section className="bg-slate-50 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-seablue">
          Data Terbuka
        </p>
        <h2 className="mt-3 font-display text-2xl font-semibold text-navy sm:text-3xl">
          Statistik Kependudukan Desa
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
          Rincian jumlah penduduk berdasarkan kategori umum, dirangkum
          otomatis dari data kependudukan desa. Hanya angka agregat yang
          ditampilkan — tidak ada data pribadi warga yang dibuka ke publik.
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <TabelKelompok
            icon={IconGenderBalance}
            title="Jenis Kelamin"
            subtitle="Jumlah penduduk laki-laki dan perempuan"
            data={perJenisKelamin}
          />
          <TabelKelompok
            icon={IconHeartHandshake}
            title="Status Pernikahan"
            subtitle="Kawin, belum kawin, cerai hidup, cerai mati"
            data={perStatusKawin}
          />
          <TabelKelompok
            icon={IconBook}
            title="Agama"
            subtitle="Jumlah penduduk berdasarkan agama"
            data={perAgama}
          />
          <TabelKelompok
            icon={IconCalendarRange}
            title="Rentang Usia"
            subtitle="Kelompok umur penduduk"
            data={perRentangUsia}
          />
          <TabelKelompok
            icon={IconBriefcase}
            title="Pekerjaan"
            subtitle="8 pekerjaan terbanyak, sisanya digabung di 'Lainnya'"
            data={perPekerjaan}
          />
        </div>
      </div>
    </section>
  );
}
