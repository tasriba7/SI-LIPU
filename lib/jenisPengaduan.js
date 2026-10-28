// Daftar jenis pengaduan yang umum di desa (dropdown di form pengaduan warga).
// Opsi terakhir "Lainnya" memunculkan kolom isian "Pengaduan tentang apa".
//
// Dikelompokkan: pengaduan umum desa, dan pengaduan seputar Pilkades (pemilihan kepala desa).
// Semua jenis Pilkades berawalan "Pilkades:" supaya mudah dikenali di daftar aduan, ringkasan
// "Aduan yang Sering Disampaikan", dan bila nanti perlu disaring.
// Nilai disimpan sebagai teks di pengajuan_layanan.jenis_pengaduan (tanpa batasan di database),
// jadi menambah/mengubah daftar di sini tidak perlu migrasi.
export const JENIS_LAINNYA = "Lainnya";

export const JENIS_PENGADUAN_UMUM = [
  "Jalan / jembatan rusak",
  "Penerangan jalan umum (PJU) mati",
  "Air bersih, irigasi, atau saluran air (drainase)",
  "Sampah dan kebersihan lingkungan",
  "Keamanan dan ketertiban",
  "Gangguan atau konflik antarwarga",
  "Pelayanan perangkat desa",
  "Administrasi kependudukan (KTP, KK, dll.)",
  "Bantuan sosial tidak tepat sasaran",
  "Penggunaan dana desa / transparansi",
  "Sengketa tanah atau batas lahan",
];

export const JENIS_PENGADUAN_PILKADES = [
  "Pilkades: nama saya/warga tidak terdaftar sebagai pemilih",
  "Pilkades: data pemilih keliru (nama ganda, meninggal/pindah, usia salah)",
  "Pilkades: dugaan politik uang atau pembagian barang",
  "Pilkades: dugaan pelanggaran kampanye (fitnah, SARA, intimidasi)",
  "Pilkades: dugaan ketidaknetralan perangkat desa atau panitia",
  "Pilkades: persyaratan atau penetapan calon dipersoalkan",
  "Pilkades: pelaksanaan di TPS (lokasi, waktu, surat suara, pelayanan)",
  "Pilkades: penghitungan atau rekap suara dipersoalkan",
  "Pilkades: pelayanan atau kinerja panitia pemilihan",
];

// Dipakai tampilan dropdown (<optgroup>). "Lainnya" tetap di luar kelompok, paling bawah.
export const KELOMPOK_PENGADUAN = [
  { label: "Pelayanan dan lingkungan desa", isi: JENIS_PENGADUAN_UMUM },
  { label: "Pemilihan Kepala Desa (Pilkades)", isi: JENIS_PENGADUAN_PILKADES },
];

// Daftar datar, dipakai validasi di server (jenis yang dikirim harus ada di sini).
export const JENIS_PENGADUAN = [...JENIS_PENGADUAN_UMUM, ...JENIS_PENGADUAN_PILKADES, JENIS_LAINNYA];
