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

## YANG BELUM
1. Tombol "Tambah template baru" di Kelola Template (sementara lewat SQL).
2. Penomoran otomatis (counter per tahun, aman balapan).
3. Surat untuk pengajuan LAMA (`pengajuan_surat`).
4. `/layanan/cek`: tampilkan nomor surat (jangan tampilkan isi/NIK, lihat SECURITY.md).
5. Tanda tangan/stempel gambar.
6. Kolom nomor surat di `/dashboard/layanan` + log aktivitas penerbitan.
7. Uji manual: migrasi 0020 & 0021, ajukan Kelahiran/Kematian, cek pratinjau & cetak A4, nomor ganda,
   login Kepala Desa (read-only), NIK tak terdata.
8. Update `docs/DATABASE_SCHEMA.md` (kolom baru `template_surat`, tabel `surat_terbit`).
