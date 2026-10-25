import { Pesan, tombol, kolomKecil } from "./UI";

/**
 * Penentuan suara terbanyak yang SERI (Perbup 10/2026 Pasal 82-83), dibuat selangkah demi selangkah:
 * isi suara calon yang seri di dusun dengan DPT terbesar; yang unggul di sana menang;
 * bila masih sama, lanjut ke dusun berikutnya.
 */
export default function PenentuanSeri({ periodeId, calonSeri, dusun, suara, penentu, bisaUbah, aksiSimpan }) {
  return (
    <div className="space-y-4 rounded-2xl border border-amber-300 bg-amber-50 p-4">
      <div>
        <p className="text-base font-bold text-amber-950">Suara terbanyak seri antara {calonSeri.length} calon</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-800">
          Menurut Perbup Pasal 83, pemenangnya ditentukan dari <b>dusun dengan jumlah pemilih (DPT) terbesar</b>.
          Calon yang memperoleh suara terbanyak di dusun itu menang. Bila masih sama, dilanjutkan ke dusun terbesar berikutnya.
        </p>
        <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-sm text-slate-800">
          <li>Isi suara tiap calon yang seri di <b>dusun teratas</b> (lihat berita acara TPS, bagian rincian per dusun).</li>
          <li>Klik <b>Simpan suara dusun</b>. Aplikasi memberi tahu siapa yang menang atau dusun mana yang diisi berikutnya.</li>
        </ol>
      </div>

      {penentu.status === "tanpa_dpt" ? (
        <Pesan jenis="bahaya" judul="DPT belum bisa dibaca">Daftar dusun diambil dari DPT yang sudah ditetapkan. Muat ulang halaman ini; bila tetap sama, hubungi Administrator desa.</Pesan>
      ) : (
        <form action={aksiSimpan} className="space-y-3">
          <input type="hidden" name="periode_id" value={periodeId} />
          <div className="overflow-x-auto rounded-xl border border-amber-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-amber-100 text-left text-slate-900">
                  <th className="px-3 py-2">Dusun (DPT terbesar dulu)</th>
                  {calonSeri.map((c) => (
                    <th key={c.id} className="px-3 py-2">No. {c.nomor_urut}<span className="block text-xs font-normal">{c.nama}</span></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dusun.map((d, i) => {
                  const giliran = penentu.status === "isi" && penentu.dusun === d.dusun;
                  const menang = penentu.status === "pemenang" && penentu.dusun === d.dusun;
                  return (
                    <tr key={d.dusun} className={`border-t border-amber-100 ${giliran ? "bg-amber-50 font-semibold" : menang ? "bg-emerald-50" : ""}`}>
                      <td className="px-3 py-2">
                        <input type="hidden" name={`dusun_${i}`} value={d.dusun} />
                        {i + 1}. {d.dusun} <span className="font-normal text-slate-600">({d.jumlah} pemilih)</span>
                        {giliran && <span className="block text-xs font-bold text-amber-800">Isi dusun ini sekarang</span>}
                        {menang && <span className="block text-xs font-bold text-emerald-800">Penentu pemenang</span>}
                      </td>
                      {calonSeri.map((c) => (
                        <td key={c.id} className="px-3 py-2">
                          {bisaUbah ? (
                            <input
                              type="number" min="0" max="999999" inputMode="numeric"
                              name={`sd_${i}_${c.id}`}
                              defaultValue={suara.get(`${d.dusun}||${c.id}`) ?? ""}
                              aria-label={`Suara No. ${c.nomor_urut} di ${d.dusun}`}
                              className={`${kolomKecil} w-24`}
                            />
                          ) : (suara.get(`${d.dusun}||${c.id}`) ?? "–")}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {bisaUbah && <button className={tombol.utama}>Simpan suara dusun</button>}
        </form>
      )}

      {penentu.status === "pemenang" && (
        <Pesan jenis="sukses" judul={`Pemenang: No. ${penentu.calon.nomor_urut} ${penentu.calon.nama}`}>
          Unggul di dusun {penentu.dusun}, dusun dengan DPT terbesar yang suaranya berbeda. Anda sekarang bisa menetapkan calon terpilih di bawah.
        </Pesan>
      )}
      {penentu.status === "isi" && (
        <Pesan jenis="perhatian" judul={`Isi dulu suara di dusun ${penentu.dusun}`}>Calon terpilih baru bisa ditetapkan setelah seri terselesaikan.</Pesan>
      )}
      {penentu.status === "sama" && (
        <Pesan jenis="bahaya" judul="Suara sama di semua dusun">Hal ini belum diatur dalam Perbup. Tanyakan ke Panitia Kabupaten sebelum menetapkan.</Pesan>
      )}
    </div>
  );
}
