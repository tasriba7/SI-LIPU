// Status kependudukan (kolom warga.status_kependudukan, migrasi 0032).
// Hanya penduduk berstatus "aktif" yang dihitung dalam jumlah penduduk,
// statistik, kartu keluarga, ekspor, dan bisa dipilih untuk dibuatkan surat.
// Penduduk yang meninggal/pindah TIDAK dihapus: barisnya tetap ada sebagai riwayat.
export const STATUS_AKTIF = "aktif";

export const LABEL_STATUS = {
  aktif: "Aktif",
  meninggal: "Meninggal",
  pindah: "Pindah keluar",
};

// Jenis catatan di tabel mutasi_penduduk.
export const LABEL_MUTASI = {
  meninggal: "Meninggal",
  pindah_keluar: "Pindah keluar",
  datang: "Datang",
};
