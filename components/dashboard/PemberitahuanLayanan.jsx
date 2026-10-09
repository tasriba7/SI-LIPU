// Kartu pemberitahuan pengajuan layanan baru untuk Kepala Desa & Ketua RT.
// Hanya info: tidak ada tombol proses. Pengajuan diproses admin desa.
// Data dari lib/pemberitahuanLayanan.js (sudah memisahkan pelapor anonim).

export default function PemberitahuanLayanan({ total, terpotong, item }) {
  if (!total) return null;

  const jumlah = terpotong ? `${total}+` : total;
  const sisa = total - item.length;

  return (
    <div className="rounded-2xl border border-gold/50 bg-gold/10 p-5">
      <h2 className="text-sm font-bold text-navy">
        {jumlah} pengajuan layanan baru dari warga
      </h2>
      <p className="mt-1 text-xs text-slate-600">
        Sekadar pemberitahuan. Silakan sampaikan ke admin desa; admin yang akan
        memprosesnya.
      </p>

      <ul className="mt-3 divide-y divide-gold/20 overflow-hidden rounded-xl border border-gold/30 bg-white">
        {item.map((p) => (
          <li key={p.id} className="flex items-start justify-between gap-3 px-4 py-2.5 text-sm">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 font-medium text-slate-800">
                <span className="truncate">{p.siapa}</span>
                {p.anonim && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                    identitas dirahasiakan
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-500">
                {p.layanan}
                {p.jenisPengaduan ? ` — ${p.jenisPengaduan}` : ""}
              </p>
              {(p.wilayah || p.kode) && (
                <p className="text-xs text-slate-400">
                  {[p.wilayah, p.kode && `Kode ${p.kode}`].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
            <span className="shrink-0 text-xs text-slate-400">{p.masuk}</span>
          </li>
        ))}
      </ul>

      {sisa > 0 && (
        <p className="mt-2 text-xs text-slate-500">
          dan {sisa}
          {terpotong ? "+" : ""} pengajuan lainnya.
        </p>
      )}
    </div>
  );
}
