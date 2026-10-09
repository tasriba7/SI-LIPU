# Status Penduduk & Mutasi (tahap 1: meninggal)

Migrasi: `supabase/migrations/0032_status_penduduk_dan_mutasi.sql`
Pemeriksaan: `supabase/verifikasi_0032.sql`

## Prinsip
Penduduk yang meninggal/pindah **tidak dihapus**. Kolom `warga.status_kependudukan`
(`aktif` | `meninggal` | `pindah`) berubah, dan hanya penduduk **aktif** yang dihitung.
Riwayat tiap perubahan ada di tabel `mutasi_penduduk`
(jenis: `meninggal` | `pindah_keluar` | `datang`; tahap 1 baru memakai `meninggal`).

## Alur Surat Keterangan Kematian
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

## Membatalkan (salah pilih orang)
`/dashboard/kependudukan/mutasi` > tombol **Batalkan** (hanya Administrator, wajib alasan).
Penduduk kembali aktif; catatan tidak dihapus, hanya ditandai dibatalkan.

## Keamanan
- Kolom status dikunci trigger `kunci_status_penduduk_trigger`: Kadus/Ketua RT tidak bisa
  mengubahnya lewat API langsung; hanya fungsi mutasi yang boleh.
- `tandai_meninggal()`: Administrator, Sekretaris Desa, Kaur, Kasi. `batalkan_mutasi()`: Administrator.
- `mutasi_penduduk`: baca mengikuti RLS `warga` (Kadus/RT hanya wilayahnya); tulis hanya lewat fungsi.

## Yang sekarang hanya menghitung penduduk aktif
Statistik beranda (total, kepala keluarga, detail, per dusun), daftar Data Kependudukan,
ekspor Excel, Kartu Keluarga & Detail Keluarga, tautan data bersama, pencarian publik
(NIK + tanggal lahir), dan pencarian penduduk di "Buat Surat Langsung".

## Urutan memasang
1. Jalankan migrasi 0032 di Supabase **lebih dulu**.
2. Baru deploy kode. (Kode baru membaca kolom `status_kependudukan`; tanpa migrasi,
   daftar penduduk akan kosong.)

## Belum ada (tahap 2)
Pencatatan pindah keluar dan penduduk datang, serta ringkasan mutasi per bulan.
