// Pesan saat tautan tidak bisa dipakai. Sengaja ramah dan jelas: bilang apa
// yang terjadi, apa artinya, dan apa yang harus dilakukan berikutnya.
// Dipakai halaman server (saat tautan dibuka) dan komponen client (kalau
// tautan ternyata baru saja dipakai orang lain).

const PESAN = {
  dibuka: {
    judul: "Mohon maaf, tautan ini sudah tidak berlaku",
    isi: "Tautan ini sudah pernah dibuka. Demi keamanan data penduduk, setiap tautan hanya bisa dipakai satu kali.",
  },
  kedaluwarsa: {
    judul: "Mohon maaf, tautan ini sudah melewati batas waktu",
    isi: "Tautan ini tidak dibuka sampai batas waktunya habis, sehingga otomatis tidak berlaku lagi.",
  },
  dibatalkan: {
    judul: "Mohon maaf, tautan ini sudah dibatalkan",
    isi: "Pihak desa telah membatalkan tautan ini, sehingga tidak bisa dibuka lagi.",
  },
  tidak_ditemukan: {
    judul: "Mohon maaf, tautan ini tidak dikenali",
    isi: "Alamat tautan tidak cocok dengan data kami. Mungkin ada bagian yang terpotong saat disalin. Coba salin ulang seluruh tautan dari pesan aslinya.",
  },
};

export default function PesanTautan({ status, desa }) {
  const pesan = PESAN[status] ?? PESAN.tidak_ditemukan;
  const namaDesa = [desa?.jenis, desa?.nama].filter(Boolean).join(" ");

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
        🔒
      </div>
      <h1 className="text-lg font-bold text-slate-800">{pesan.judul}</h1>
      <p className="mt-2 text-sm text-slate-600">{pesan.isi}</p>
      <div className="mt-5 rounded-xl bg-slate-50 p-4 text-left text-sm text-slate-600">
        <p className="font-semibold text-slate-700">Apa yang bisa dilakukan?</p>
        <p className="mt-1">
          Kalau Anda masih membutuhkan data, silakan hubungi kantor{" "}
          {namaDesa || "desa"} dan minta dikirimkan tautan yang baru.
        </p>
      </div>
    </div>
  );
}
