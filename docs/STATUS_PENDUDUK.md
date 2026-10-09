# Status Penduduk & Mutasi (tahap 1: meninggal, tahap 2: pindah keluar & datang)

Migrasi: `supabase/migrations/0032_status_penduduk_dan_mutasi.sql` (tahap 1),
`supabase/migrations/0033_pindah_datang_dan_ringkasan_mutasi.sql` (tahap 2)
Pemeriksaan: `supabase/verifikasi_0032.sql`, `supabase/verifikasi_0033.sql`

## Prinsip
Penduduk yang meninggal/pindah **tidak dihapus**. Kolom `warga.status_kependudukan`
(`aktif` | `meninggal` | `pindah`) berubah, dan hanya penduduk **aktif** yang dihitung.
Riwayat tiap perubahan ada di tabel `mutasi_penduduk`
(jenis: `meninggal` | `pindah_keluar` | `datang`).

## Alur Surat Keterangan Kematian (tahap 1)
1. Buka pengajuan > Buat Surat (template `kematian`).
2. Di panel **Hubungkan ke data penduduk**, cari dan pilih penduduk yang meninggal.
   Isi surat (nama, tempat/tgl lahir, agama, alamat, usia) disusun ulang dari data penduduk.
3. Saat surat **disimpan**, server memanggil fungsi `tandai_meninggal()`:
   status menjadi `meninggal`, catatan masuk ke `mutasi_penduduk`, jumlah penduduk
   (beranda publik & dashboard) otomatis berkurang.
4. Jika almarhum Kepala Keluarga, editor mengingatkan agar Kepala Keluarga baru ditentukan.
5. Menyimpan ulang surat yang sama tidak menggandakan catatan (hanya memperbarui tanggal).

Kegagalan menandai status **tidak** membatalkan surat: surat tetap tersimpan dan petugas
diberi peringatan.

## Pindah Keluar (tahap 2)
`/dashboard/kependudukan/mutasi/pindah-keluar` (tombol **Catat Pindah Keluar** di halaman Mutasi).
1. Cari penduduk aktif (nama/NIK). Anggota keluarga dengan No. KK yang sama tampil dengan
   kotak centang; tombol **Pilih seluruh keluarga** mencentang semuanya.
2. Isi tanggal pindah, tujuan pindah (wajib), dan catatan (opsional).
3. Simpan: fungsi `catat_pindah_keluar()` mengubah status menjadi `pindah`, mengisi
   `tanggal_status`, dan membuat catatan `pindah_keluar` untuk tiap orang, **semuanya dalam
   satu transaksi** (gagal satu = gagal semua). Maksimal 20 orang per pencatatan.
4. Jika Kepala Keluarga ikut pindah dan masih ada anggota tersisa, muncul pengingat untuk
   menentukan Kepala Keluarga baru (Data Kependudukan > Edit).

## Penduduk Datang (tahap 2)
`/dashboard/kependudukan/mutasi/datang` (tombol **Catat Datang**). Ada dua tab:
- **Penduduk baru**: formnya seperti Tambah Data Keluarga (No. KK, alamat, dusun, RT/RW, anggota),
  ditambah tanggal datang dan daerah asal (wajib). Penduduk langsung `aktif` dan dihitung.
  Tanggal lahir tidak boleh setelah tanggal datang (bayi yang lahir di desa bukan "datang").
- **Datang kembali**: untuk penduduk berstatus `pindah` yang kembali. Data lamanya dipakai lagi,
  status kembali `aktif`. Tanggal datang tidak boleh sebelum tanggal pindah keluarnya.

Penolakan otomatis (pesan jelas ke petugas): NIK sudah aktif; NIK ada tetapi berstatus pindah
(disuruh memakai "Datang kembali"); orang yang meninggal; KK yang sudah punya Kepala Keluarga aktif.
Semua orang dalam satu pencatatan disimpan dalam satu transaksi.

## Ringkasan per Bulan (tahap 2)
`/dashboard/kependudukan/mutasi/ringkasan?tahun=2026`: tabel 12 bulan berisi jumlah meninggal,
pindah keluar, datang (beserta rincian L/P) dan selisih (datang - pindah - meninggal).
Dihitung dari tanggal kejadian; catatan yang dibatalkan tidak dihitung. Memakai fungsi
`ringkasan_mutasi_bulanan()` yang mengikuti RLS. Kelahiran dan data yang masuk lewat Tambah Warga
atau Import Excel **tidak** termasuk dalam angka ini.

## Membatalkan (salah pilih orang / salah catat)
`/dashboard/kependudukan/mutasi` > tombol **Batalkan** (hanya Administrator, wajib alasan).
Catatan tidak dihapus, hanya ditandai dibatalkan. Akibatnya per jenis:
- `meninggal` / `pindah_keluar`: penduduk kembali `aktif`. Pindah keluar tidak bisa dibatalkan
  bila orangnya sudah tercatat datang kembali (batalkan catatan datang dulu).
- `datang`: penduduk dikeluarkan lagi (status `pindah`). Hanya bisa bila tidak ada catatan lebih
  baru untuk orang itu. Untuk penduduk baru yang salah input, barisnya tetap ada tetapi tidak
  aktif; NIK yang sama nanti dicatat lewat **Datang kembali**.
- Jika pengembalian ke aktif ditolak karena KK sudah punya Kepala Keluarga baru, pesannya
  diteruskan ke Administrator.

## Keamanan
- Kolom status dikunci trigger `kunci_status_penduduk_trigger`: Kadus/Ketua RT tidak bisa
  mengubahnya lewat API langsung; hanya fungsi mutasi yang boleh.
- `tandai_meninggal()`, `catat_pindah_keluar()`, `catat_datang()`: Administrator, Sekretaris Desa,
  Kaur, Kasi (dicek di server aplikasi DAN di fungsi database). `batalkan_mutasi()`: Administrator.
  Semua fungsi tidak bisa dipanggil tanpa login.
- `mutasi_penduduk`: baca mengikuti RLS `warga` (Kadus/RT hanya wilayahnya); tulis hanya lewat fungsi.

## Yang hanya menghitung penduduk aktif
Statistik beranda (total, kepala keluarga, detail, per dusun), daftar Data Kependudukan,
ekspor Excel, Kartu Keluarga & Detail Keluarga, tautan data bersama, pencarian publik
(NIK + tanggal lahir), dan pencarian penduduk di "Buat Surat Langsung".

## Urutan memasang
1. Jalankan migrasi 0032, lalu **0033**, di Supabase **lebih dulu** (SQL Editor, lalu
   `verifikasi_0033.sql` untuk memeriksa).
2. Baru deploy kode. (Halaman Mutasi membaca kolom `asal_tujuan` dari 0033; tanpa migrasi,
   daftar mutasi menampilkan pesan galat.)

## Ide lanjutan
Template Surat Keterangan Pindah / Datang yang otomatis mencatat mutasi (seperti Surat Kematian);
ekspor ringkasan bulanan ke Excel/PDF.
