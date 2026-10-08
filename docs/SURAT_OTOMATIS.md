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

## YANG BELUM (untuk AI/developer berikutnya)
1. **Template Surat Kelahiran & Kematian** belum di-seed. Keduanya menerangkan ORANG LAIN
   (bayi/almarhum), bukan pemohon. Perlu: (a) field Form Builder di jenis layanan tsb
   (nama anak, hari/tanggal lahir, nama ibu, nama ayah; nama almarhum, tanggal/pukul
   meninggal, usia, penyebab) dengan `field_key` snake_case, (b) template memakai
   `{{field_key}}` itu. Tidak perlu ubah kode, cukup INSERT ke `template_surat`.
2. **Halaman admin "Kelola Template Surat"** (`/dashboard/template-surat`, hanya admin):
   daftar, edit judul/pembuka/biodata/isi/penutup, aktif/nonaktif, tombol "lihat daftar
   variabel". Saat ini template hanya bisa diubah lewat SQL. Ikuti pola
   `app/dashboard/jenis-layanan`. Tambahkan menu di sidebar.
3. **Halaman daftar surat terbit** (`/dashboard/surat-terbit`): cari nomor/nama, cetak ulang
   dari snapshot tanpa lewat pengajuan.
4. **Penomoran otomatis** (opsional): format nomor per desa (mis. `470/{urut}/DS/{bulan_romawi}/{tahun}`)
   dengan counter per tahun yang aman dari balapan (fungsi SQL / sequence). Sekarang manual.
5. **Surat untuk pengajuan LAMA** (`pengajuan_surat`, modul 0003) belum didukung; hanya
   `pengajuan_layanan`.
6. **Warga di `/layanan/cek`**: tampilkan "Surat sudah terbit, silakan ambil" (status
   `selesai` + catatan sudah otomatis, tapi nomor surat belum ditampilkan). Jangan tampilkan
   isi surat/NIK ke publik (lihat SECURITY.md).
7. **Tanda tangan/stempel gambar** (opsional): unggah ke bucket `desa-media`, tampilkan di blok TTD.
8. **Kolom nomor surat di `/dashboard/layanan`** dan log aktivitas penerbitan.
9. **Uji manual**: jalankan migrasi 0020, buat pengajuan SKTM dengan NIK terdata, cek pratinjau
   & cetak A4 (Chrome → Simpan sebagai PDF), uji nomor ganda, uji login Kepala Desa (harus
   read-only), uji NIK tidak terdata (peringatan kuning muncul).
10. Update `docs/DATABASE_SCHEMA.md`, `docs/ROADMAP.md`, dan bagian STATUS TERKINI di
    `docs/AI_HANDOFF.md` (aturan #5) setelah bagian ini dipasang.
