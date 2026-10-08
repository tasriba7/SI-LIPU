# SURAT_OTOMATIS.md — Modul 4: Surat Otomatis dari Pengajuan Layanan

Status: **BAGIAN 1 selesai** (lihat daftar sisa pekerjaan di bawah).

## Cara kerja (alur admin)
1. Warga mengajukan layanan seperti biasa (`/layanan/ajukan/[id]`).
2. Staf buka `/dashboard/layanan/[id]` → klik kartu **Buat Surat**.
3. Halaman `/dashboard/layanan/[id]/surat` memilih template otomatis (cocok kata kunci
   nama layanan), mengisi data dari `warga` (via `pengajuan_layanan.warga_id`) + `config_desa`.
4. Staf mengisi **nomor surat**, mengedit isi bila perlu, pratinjau tampil langsung.
5. **Simpan & tandai selesai** → salinan final masuk `surat_terbit`, status pengajuan
   menjadi `selesai`. **Cetak / Simpan PDF** memakai dialog cetak browser (A4).

## Keputusan desain
- **PDF = halaman cetak HTML + CSS `@media print`**, bukan jsPDF. Alasan: kop surat, paragraf
  rata kiri-kanan, dan tabel biodata jauh lebih presisi dan mudah dirawat. Tidak ada
  dependensi baru. jsPDF tetap dipakai untuk modul lain.
- **Snapshot**: `surat_terbit.isi` (jsonb) menyimpan isi final, jadi edit template di
  kemudian hari tidak mengubah surat lama.
- **Satu surat per pengajuan** (`pengajuan_id` unique). Simpan ulang = memperbarui.
- **Nomor surat unik** lewat unique index `lower(btrim(nomor_surat))`; server mengubah
  error 23505 menjadi pesan ramah.
- **Hak akses**: lihat/cetak = semua staf; menerbitkan = admin, sekretaris_desa, kaur,
  kasi (`ROLE_PENERBIT_SURAT` di `lib/roles.js`, dicek di server lewat
  `pastikanBisaTerbitkanSurat` di `lib/akses.js`, dan di RLS lewat `akses_tulis_penuh()`).
  Kepala Desa hanya melihat. Pengajuan anonim ditolak.
- Nama desa/wilayah/logo/nama Kepala Desa selalu dari `config_desa` (aturan #7).

## File
| File | Fungsi |
|---|---|
| `supabase/migrations/0020_template_surat_dan_surat_terbit.sql` | tabel, RLS, seed 4 template |
| `lib/suratTemplate.js` | variabel `{{...}}`, `buatDraf`, format tanggal, penandatangan |
| `lib/roles.js` / `lib/akses.js` | `bisaTerbitkanSurat`, `pastikanBisaTerbitkanSurat` |
| `app/dashboard/layanan/[id]/surat/page.js` | ambil data (server) |
| `app/dashboard/layanan/[id]/surat/SuratEditor.jsx` | form edit + pratinjau + cetak |
| `app/dashboard/layanan/[id]/surat/actions.js` | `terbitkanSurat` (validasi, simpan, set selesai) |

## Variabel template
`{{nama}} {{nik}} {{tempat_lahir}} {{tanggal_lahir}} {{ttl}} {{jenis_kelamin}} {{agama}}
{{pekerjaan}} {{status_kawin}} {{alamat}} {{keperluan}} {{nama_desa}} {{jenis_wilayah}}
{{kecamatan}} {{kabupaten}} {{provinsi}}` + setiap `field_key` di `data_tambahan`
(mis. `{{jenis_usaha}}`). Variabel kosong → string kosong → kolom disorot kuning di editor.

## Pembaruan (sesi lanjutan)
Selesai: Surat Kelahiran & Kematian (migrasi `0021`), halaman Kelola Template Surat
(`/dashboard/template-surat`, admin), halaman Surat Terbit (`/dashboard/surat-terbit`),
komponen cetak bersama `components/dashboard/SuratPratinjau.jsx`, kartu "Buat Surat" di detail
pengajuan, dan fungsi `bisaTerbitkanSurat` / `pastikanBisaTerbitkanSurat` (sebelumnya belum ada di kode).

Template kini punya 3 kolom opsional: `judul_atas`, `teks_tengah`, `biodata2` (dua blok biodata).
Field tanggal di Form Builder otomatis menyediakan `{{key}}`, `{{key_angka}}` (22-09-1999) dan
`{{key_hari}}` (Rabu). `{{usia_almarhum}}` dihitung otomatis; `{{alamat_anak}}`/`{{alamat_almarhum}}`
jatuh ke alamat pemohon bila kosong.

## Pembaruan lanjutan (migrasi 0022)
- **Penomoran otomatis**: format per template (`format_nomor`, mis. `470/{urut3}/DS/{bulan_romawi}/{tahun}`)
  + `kelompok_nomor`. Kosongkan kolom nomor di editor = nomor diambil saat disimpan (atomik, reset per tahun).
  Petunjuk "Otomatis: ..." di editor hanya perkiraan, belum memakai nomor. Mulai dari angka tertentu:
  lihat komentar di akhir bagian 1 migrasi 0022.
- **Tambah template baru**: `/dashboard/template-surat/tambah` (kerangka kosong atau salin template lain).
- **Pengajuan LAMA**: `/dashboard/surat/[id]/surat`; surat disimpan di `surat_terbit.pengajuan_surat_id`.
  Data warga dilengkapi lewat pencocokan NIK ke tabel `warga` bila ada.
- **Cek status publik** menampilkan nomor surat (bukan isi/NIK).
- **Tanda tangan & stempel**: `/dashboard/pengaturan-desa/tanda-tangan` (admin). Bucket privat `desa-ttd`,
  signed URL 1 jam. Snapshot surat hanya menyimpan penanda `tampil_ttd`/`tampil_stempel`; gambar diambil saat
  ditampilkan. Catatan: surat lama yang dicetak ulang akan memakai gambar TERBARU di pengaturan.

## YANG BELUM
1. Kolom nomor surat di `/dashboard/layanan` dan log aktivitas penerbitan.
2. Pembatalan/revisi nomor (nomor yang terpakai tidak dikembalikan; kekosongan urutan wajar bila simpan gagal).
3. Hapus template (sementara cukup dinonaktifkan).
4. Uji manual: migrasi 0020-0022 berurutan; ajukan Kelahiran/Kematian; nomor otomatis dari dua akun bersamaan;
   surat untuk pengajuan lama; cek status publik menampilkan nomor; unggah ttd/stempel lalu cetak A4;
   login Kepala Desa (read-only).
