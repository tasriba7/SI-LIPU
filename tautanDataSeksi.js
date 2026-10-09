// Daftar isi yang bisa dibagikan lewat Tautan Bagikan Data + konstanta kolom.
// File ini AMAN diimpor dari Client Component (tidak ada kode server di sini).
//
// Mau menambah isi baru (mis. rekap layanan)? Tambah satu entri di SEKSI_TAUTAN,
// lalu tambahkan pengambil datanya di lib/tautanData.js (ambilDataTautan) dan
// tampilannya di app/data-bersama/[token]/GerbangTautan.jsx.

export const SEKSI_TAUTAN = [
  {
    id: "penduduk_lengkap",
    label: "Data penduduk lengkap",
    ket: "Seluruh warga beserta NIK, No. KK, alamat, dll. Penerima mengunduh dalam bentuk Excel.",
    sensitif: true,
  },
  {
    id: "data_keluarga",
    label: "Data Kartu Keluarga",
    ket: "Daftar No. KK, kepala keluarga, alamat, dan jumlah anggota. Unduhan Excel.",
    sensitif: true,
  },
  {
    id: "statistik_penduduk",
    label: "Statistik penduduk saja",
    ket: "Hanya angka ringkasan (jenis kelamin, usia, pekerjaan, agama, status nikah, per dusun). Tanpa data pribadi. Unduhan Excel atau PDF.",
    sensitif: false,
  },
];

export const SEKSI_IDS = SEKSI_TAUTAN.map((s) => s.id);

export const labelSeksi = (id) =>
  SEKSI_TAUTAN.find((s) => s.id === id)?.label ?? id;

// Batas waktu (hari) tautan yang belum juga dibuka penerima.
export const PILIHAN_HARI = [1, 3, 7];
export const HARI_DEFAULT = 3;

// Header & kolom Excel data penduduk. Disamakan dengan ekspor di
// app/api/kependudukan/export/route.js (dan template impor), supaya format
// file konsisten di mana pun diunduh.
export const HEADER_PENDUDUK = [
  "NIK", "No. KK", "Nama Lengkap", "Tempat Lahir", "Tanggal Lahir",
  "Jenis Kelamin", "Status Kawin", "Status dalam KK", "Alamat", "Dusun",
  "RT", "RW", "No. HP", "Pekerjaan", "Agama",
];

export const KOLOM_PENDUDUK = [
  "nik", "no_kk", "nama_lengkap", "tempat_lahir", "tanggal_lahir",
  "jenis_kelamin", "status_kawin", "status_dalam_kk", "alamat", "dusun",
  "rt", "rw", "no_hp", "pekerjaan", "agama",
];

export const HEADER_KELUARGA = [
  "No. KK", "Kepala Keluarga", "Alamat", "Dusun", "RT", "RW", "Jumlah Anggota",
];
