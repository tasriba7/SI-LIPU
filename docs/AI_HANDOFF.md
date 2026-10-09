# AI_HANDOFF.md — Baca Ini Dulu Sebelum Ngoding

Dokumen ini adalah "pegangan wajib" bagi AI atau developer manapun yang melanjutkan proyek ini.
Tujuannya: siapapun yang lanjut — hari ini, minggu depan, atau tahun depan — bisa langsung paham
tanpa perlu penjelasan ulang dari pemilik proyek.

---

## 1. TUJUAN PROYEK
Membangun **SI-LIPU** (Sistem Informasi Layanan Interaktif Pelayanan Umum) — satu platform
terpadu, bukan aplikasi lepas-lepas — untuk digunakan oleh perangkat desa dengan **beragam
latar belakang pendidikan**. Prioritas nomor satu: **kemudahan pemakaian**, bukan kecanggihan
fitur.

**Instance pertama:** Desa Tatakalai, Kab. Banggai Kepulauan.
**Pemilik proyek:** Tasrib A. Abbas, S.AP.

📌 Baca juga `docs/BRANDING.md` — WAJIB dipatuhi soal cara penamaan, kredit originator, dan
aturan jika sistem ini direplikasi ke desa lain.

📌 Baca juga `docs/SECURITY.md` — WAJIB dipatuhi untuk fitur apapun yang menyentuh data warga
(NIK, KK, alamat, dll), terutama fitur publik tanpa login seperti "Ajukan Layanan".

---

## 2. ATURAN YANG TIDAK BOLEH DILANGGAR (NON-NEGOTIABLE)

1. **Satu database, satu sistem login.**
   Jangan pernah membuat tabel warga/penduduk baru khusus untuk satu modul.
   Semua modul WAJIB memakai tabel master yang sama (lihat `DATABASE_SCHEMA.md`).

2. **Jangan mendesain ulang struktur folder/arsitektur yang sudah ada** tanpa alasan kuat.
   Kalau merasa perlu, tulis alasannya di `docs/DECISIONS_LOG.md` (buat file ini jika belum ada)
   sebelum mengubah, jangan langsung eksekusi.

3. **UI harus sesederhana mungkin.**
   - Bahasa Indonesia, istilah awam (bukan istilah teknis/IT).
   - Tombol besar, alur linear, minim halaman yang membingungkan.
   - Setiap fitur baru harus bisa dipakai orang yang baru pertama kali pegang komputer/HP.

4. **Jangan hardcode kredensial/API key di kode.** Selalu pakai environment variable (`.env`),
   dan pastikan `.env` masuk `.gitignore`.

5. **Setiap kali menyelesaikan satu bagian pekerjaan, WAJIB update:**
   - Bagian "STATUS TERKINI" di bawah ini (di dokumen ini)
   - `docs/ROADMAP.md` (centang yang selesai)
   - Commit ke GitHub dengan pesan jelas (bukan "update" atau "fix")

6. **Jangan menghapus/mengubah modul yang sudah berjalan** hanya untuk menambah modul baru.
   Modul baru harus "nempel" ke sistem yang ada, bukan menggantikannya.

7. **Jangan hardcode nama desa ("Tatakalai") di dalam kode program.** Selalu ambil dari
   environment variable/konfigurasi (lihat `docs/BRANDING.md`), supaya sistem ini bisa
   direplikasi ke desa lain tanpa bongkar kode, dan data tiap desa tetap terpisah.

8. **Jangan hapus kredit originator** ("SI-LIPU dikembangkan pertama kali untuk Desa Tatakalai,
   digagas oleh Tasrib A. Abbas, S.AP.") dari halaman "Tentang" aplikasi.

---

## 3. STATUS TERKINI
> ⚠️ AI/developer yang mengerjakan WAJIB mengedit bagian ini setiap selesai kerja.

**Terakhir diupdate:** 10 Oktober 2026 (setelah implementasi Mutasi Penduduk tahap 2)
**Fase sekarang:** Fase 0, 1, 1.5, dan 1c selesai. Fase 2 (Surat) berjalan lewat 2 jalur
(lama & baru — lihat catatan migrasi di bawah).

### Sudah selesai
- [x] Setup Next.js 15 (App Router) + Tailwind + Supabase client/server/middleware
- [x] Splash screen logo saat aplikasi dimuat
- [x] Endpoint `/api/health` cek koneksi Supabase
- [x] Halaman `/login` untuk perangkat desa (Supabase Auth)
- [x] Dashboard `/dashboard` dengan sidebar, proteksi auth
- [x] Modul Pengajuan Surat LAMA (`/layanan/surat`) — TETAP jalan untuk kompatibilitas
- [x] **Modul Kependudukan** (`/dashboard/kependudukan`) — tabel `warga`, tambah data,
      pencarian nama/NIK. Lookup publik pakai RPC `cari_warga_publik` (NIK+Tanggal Lahir,
      dua faktor, masking, rate limit) sesuai `docs/SECURITY.md`.
- [x] **Form Builder** (`/dashboard/jenis-layanan`) — admin bisa tambah jenis layanan baru
      + susun field dinamis (teks/angka/tanggal/pilihan) + wajib/opsional, tanpa developer.
      Warga akses lewat `/layanan` (grid semua jenis aktif) → `/layanan/ajukan/[id]`
      (form dinamis + lookup NIK+Tanggal Lahir) → `/layanan/cek` (cek status, kompatibel
      dengan kode tracking lama maupun baru).
- [x] **Sistem slot Kadus/Ketua RT** — admin isi wilayah kosong di `/dashboard/posisi`,
      calon Kadus/RT daftar mandiri di `/pendaftaran` (otomatis ditolak kalau slot sudah
      terisi, lewat trigger database), admin approve di `/dashboard/pendaftaran` (otomatis
      buat akun Supabase Auth + kunci slot). "Kosongkan Slot" hanya bisa admin.
- [x] Kredit originator di footer halaman utama
- [x] **Pengaturan Desa** (`/dashboard/pengaturan-desa`) — tabel singleton
      `config_desa` (migration 0010), sesuai rencana "tabel konfigurasi"
      di `docs/BRANDING.md`. Admin isi nama desa/kelurahan, status
      Desa/Kelurahan, provinsi/kabupaten/kecamatan (dropdown bertingkat dari
      API wilayah.id, dengan fallback isian manual), alamat kantor desa, dan
      upload foto latar beranda (Supabase Storage bucket `desa-media`,
      publik-baca/staf-tulis). Beranda publik (`app/page.js`) sekarang
      menampilkan identitas ini secara dinamis (nama desa teks besar +
      wilayah administratif + foto latar), bukan hardcode "Tatakalai".
- [x] **Galeri Kegiatan Desa** (`/dashboard/galeri`) — tabel `galeri_kegiatan`
      (migration 0013), admin unggah foto kegiatan (Supabase Storage bucket
      `desa-media`, pakai ulang bucket & kebijakan yang sama dengan foto
      latar/logo, prefix nama file `galeri-`) + judul + rincian (opsional),
      tanpa perlu developer. Beranda publik menampilkan 8 foto terbaru dalam
      grid dengan lightbox (klik foto untuk lihat versi besar + rincian),
      section ini otomatis sembunyi kalau belum ada foto sama sekali.
      Halaman publik penuh di `/galeri` (semua foto) + tautan di menu
      header publik & tautan "Lihat semua galeri" di beranda kalau foto
      lebih dari 8.

- [x] **Pengaduan Anonim** — pada layanan berkategori `pengaduan`, warga memilih
      "Tampilkan identitas saya" atau "Rahasiakan identitas (anonim)" sebelum mengisi
      form. Kalau anonim: nama/NIK/No. HP TIDAK diminta dan TIDAK disimpan (kolom
      `pengajuan_layanan.anonim = true`, identitas dipaksa kosong lewat constraint +
      trigger di migration 0018, jadi admin pun tidak bisa melihat atau mengisinya
      belakangan). Pelapor hanya memegang kode tracking (10 karakter, dibuat dengan
      crypto) untuk cek status di `/layanan/cek`. Di dashboard admin pelapor tampil
      "Anonim", tombol WhatsApp tidak muncul. **Wajib jalankan `0018_pengaduan_anonim.sql`
      di Supabase.**

- [x] **Surat Otomatis (Modul 4)** — lihat `docs/SURAT_OTOMATIS.md`. Migrasi 0020 + 0021
      (template Kelahiran & Kematian, dua blok biodata). Halaman: `/dashboard/layanan/[id]/surat`
      (editor), `/dashboard/template-surat` (admin), `/dashboard/surat-terbit` (arsip & cetak ulang).
      **Wajib jalankan `0020`, `0021`, lalu `0022` di Supabase** (0022: penomoran otomatis, surat untuk pengajuan lama, nomor di cek status, bucket privat `desa-ttd`).

- [x] **Riwayat Ajuan Warga** (`/layanan/riwayat`, migrasi 0023) — warga memasukkan NIK + tanggal
      lahir (dua faktor, rate limit 5 gagal/15 menit lewat `hitung_percobaan_gagal`) dan melihat semua
      pengajuannya (kode tracking, status, catatan, nomor surat) dari `pengajuan_layanan` + `pengajuan_surat`.
      RPC `riwayat_pengajuan_publik`; "tidak cocok" dan "belum ada pengajuan" sama-sama kosong. Pengaduan
      anonim tidak muncul. **Wajib jalankan `0023_riwayat_pengajuan_publik.sql`.**

- [x] **Tautan Bagikan Data (sekali pakai)** — admin: `/dashboard/pengaturan-desa/bagikan-data`
      (kartu di Pengaturan Desa). Admin isi nama instansi + keperluan, centang isi yang dibagikan
      (data penduduk lengkap / data Kartu Keluarga / statistik saja), pilih batas waktu 1/3/7 hari,
      lalu salin tautan (tampil SEKALI). Penerima membuka `/data-bersama/[token]` (publik, tanpa login):
      mula-mula muncul **halaman peringatan sekali pakai** (membaca halaman ini TIDAK menghanguskan
      tautan, jadi pratinjau WhatsApp aman), baru setelah centang + tombol "Buka Data Sekarang"
      tautan hangus dan data tampil + tombol unduh (Excel untuk penduduk/KK, Excel & PDF untuk
      statistik; dibuat di browser dari data yang sudah dimuat, tidak memanggil server lagi).
      Tautan yang sudah dibuka/kedaluwarsa/dibatalkan/tidak dikenal menampilkan pesan "Mohon maaf"
      yang berbeda-beda dan jelas. Tabel `tautan_data` (migrasi 0024): hanya HASH token disimpan,
      data tidak disalin (diambil saat dibuka), riwayat tidak bisa dihapus, trigger mencegah tautan
      dihidupkan lagi. Pembukaan atomik (UPDATE bersyarat) di server pakai `SUPABASE_SECRET_KEY`.
      **Wajib jalankan `0024_tautan_data_sekali_pakai.sql` di Supabase.**

- [x] **Statistik Kependudukan di beranda dashboard** — komponen `components/dashboard/StatistikDashboard.jsx`
      (client, murni SVG/CSS, tanpa library grafik) dipasang di `app/dashboard/page.js` di atas daftar modul.
      Isi: 4 kartu angka (penduduk, KK, laki-laki, perempuan) dengan count-up, sorotan singkat (usia/pekerjaan
      terbanyak, dusun terpadat, data jenis kelamin belum terisi), lalu grafik donat jenis kelamin & status nikah,
      batang kelompok usia, batang per dusun (L/P), dan batang agama & pekerjaan. Grafik bisa disembunyikan
      (diingat di localStorage). Data dari RPC yang sama dengan beranda publik (`lib/statistikBeranda.js`),
      jadi **tanpa migrasi baru**. Responsif HP & laptop, menghormati "kurangi gerakan".

- [x] **Status Penduduk & Mutasi (tahap 1 + 2)** — lihat `docs/STATUS_PENDUDUK.md`. Penduduk yang
      meninggal/pindah tidak dihapus, hanya statusnya berubah (`warga.status_kependudukan`) dan tidak
      dihitung. Tahap 1: meninggal lewat Surat Kematian (migrasi 0032). Tahap 2: **Catat Pindah Keluar**,
      **Catat Datang** (penduduk baru / datang kembali) dan **Ringkasan per Bulan** di
      `/dashboard/kependudukan/mutasi/...` (migrasi 0033). **Wajib jalankan `0032` lalu `0033` di Supabase
      sebelum deploy.**

### PENYIMPANGAN YANG SUDAH DIPERBAIKI (riwayat, untuk konteks)
Sebelumnya modul Surat pakai tabel khusus (`pengajuan_surat`) dengan jenis surat hardcode,
tanpa lookup warga, dan tidak ada sistem slot RT. Semua sudah diperbaiki lewat migrasi
0004-0006 dan kode di atas. **Tabel `pengajuan_surat` & halaman `/layanan/surat` LAMA
SENGAJA dibiarkan tetap ada** (bukan dihapus) supaya data lama & link yang sudah beredar
tetap jalan — tapi jalur BARU untuk warga adalah `/layanan` (generik, Form Builder).

### Belum dikerjakan / TODO berikutnya
- [ ] Jalankan migrasi `0010_config_desa.sql` di Supabase project instance ini (belum
      otomatis — lihat langkah di `supabase/migrations/`), lalu isi Pengaturan Desa pertama
      kali lewat `/dashboard/pengaturan-desa` (baris `config_desa` default masih kosong).
- [ ] Jalankan migrasi `0013_galeri.sql` di Supabase project instance ini, lalu admin bisa
      langsung mulai isi foto lewat `/dashboard/galeri`.
- [ ] Pertimbangkan batasi menu "Pengaturan Desa" hanya untuk role `kepala_desa`/
      `sekretaris_desa` (saat ini semua staf yang login bisa ubah, sama seperti modul lain).
- [ ] Migrasi data lama dari `pengajuan_surat` ke `pengajuan_layanan` (opsional, kalau admin
      mau riwayat surat lama tergabung di satu inbox)
- [ ] Import data warga massal dari Excel (saat ini hanya input satu-satu)
- [ ] Upload file/dokumen di form pengajuan (form_schema sudah siapkan slot tipe field,
      tapi `upload_file` belum diaktifkan — butuh Supabase Storage)
- [ ] Modul Keuangan Desa/APBDes (Fase 3, belum dimulai)
- [ ] Halaman edit/nonaktifkan data warga (saat ini baru tambah + lihat)
- [ ] Notifikasi WA/email otomatis saat status pengajuan berubah

---

## 4. LANGKAH KERJA UNTUK AI YANG BARU MASUK PROYEK INI

1. Baca `README.md`, `ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, `ROADMAP.md` — dalam urutan itu.
2. Cek bagian "STATUS TERKINI" di atas untuk tahu sudah sampai mana.
3. Cek riwayat commit GitHub untuk lihat perubahan terakhir.
4. Kerjakan HANYA bagian yang jadi prioritas di ROADMAP (jangan loncat ke fitur lain).
5. Setelah selesai, update dokumen ini + ROADMAP.md, lalu commit.
6. Jika ragu-ragu soal desain/arsitektur, **jangan menebak** — tanyakan ke pemilik proyek dulu.

---

## 5. KONTAK / PEMILIK PROYEK
Proyek ini dipesan dan diawasi langsung oleh pemilik (bukan sepenuhnya otonom AI).
Setiap keputusan besar (ganti stack, ubah struktur database, dsb) harus dikonfirmasi ke pemilik
proyek terlebih dahulu — jangan diputuskan sepihak oleh AI.

## Update: role admin & Kepala Desa read-only (migrasi 0017)
- Role baru `admin` = satu-satunya yang boleh Kelola Akun Staf (termasuk Buat Akun), Pengaturan Desa, Slot Posisi, Pendaftaran Akun.
- `kepala_desa` = hanya lihat. Dijaga di server (`lib/akses.js`) DAN di RLS (fungsi `boleh_tulis_staf`, `akses_tulis_penuh`, `adalah_admin`).
- Akun Kepala Desa bisa dibuat lewat slot + pendaftaran (role `kepala_desa` di `posisi_perangkat`) atau langsung oleh admin di Kelola Akun Staf.
- Sekdes/Kaur/Kasi tetap bisa menulis data seperti sebelumnya, tetapi tidak lagi punya akses Kelola Akun / Pengaturan Desa.
- `profiles`: role/dusun/jabatan tidak bisa diubah user sendiri (trigger `kunci_kolom_profil`).
