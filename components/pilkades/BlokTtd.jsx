// Blok tanda tangan dokumen cetak Pilkades. Nama diambil dari Susunan Panitia
// (lib/pilkades.js: susunPenandatangan). Bila nama belum diisi, garis titik dibiarkan
// supaya tetap bisa ditulis tangan. Gaya (.ttd-grup, .ttd, .ruang) ada di halaman cetak.

export default function BlokTtd({ judulPanitia, tempatTanggal, penandatangan }) {
  return (
    <div className="ttd-grup">
      {tempatTanggal && <div className="ttd-tempat">{tempatTanggal}</div>}
      <div className="ttd-judul">{judulPanitia}</div>
      <div className="ttd-baris">
        {penandatangan.map((p) => (
          <div className="ttd" key={p.jabatan}>
            <div>{p.label},</div>
            <div className="ruang" />
            <div className="ttd-nama">{p.nama ? <u>{p.nama}</u> : "(............................................)"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
