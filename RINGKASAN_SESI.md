# RINGKASAN_SESI.md — Baca Ini PALING PERTAMA di Sesi Baru

> Dokumen ini dibuat karena sesi percakapan sebelumnya (dengan pemilik proyek) kemungkinan
> akan berakhir/ganti akun. Ini rangkuman LENGKAP semua keputusan yang sudah diambil,
> supaya AI di sesi baru bisa langsung lanjut tanpa tanya ulang dari nol.

**Cara pakai dokumen ini:** baca dulu file ini, lalu baca `docs/AI_HANDOFF.md` (terutama
bagian "PENYIMPANGAN DARI RENCANA" — itu status kode yang SEBENARNYA sudah jalan).

---

## 1. Siapa & Apa

- **Pemilik proyek:** Tasrib A. Abbas, S.AP.
- **Nama aplikasi:** **SI-LIPU** — Sistem Informasi Layanan Interaktif Pelayanan Umum
  - "Lipu" diambil dari "Lipu Babasal/Lipu Tumbe", nama kuno Kabupaten Banggai Kepulauan
    yang berarti "Negeri Pertama". Dipilih karena bermakna budaya lokal tapi TIDAK menyiratkan
    cakupan wilayah tertentu (beda dengan opsi awal "SI-PELING" yang ditolak karena terkesan
    hanya untuk seluruh Pulau Peling).
- **Instance pertama:** Pemerintah Desa **Tatakalai**, Kabupaten Banggai Kepulauan,
  Sulawesi Tengah.
- **Repo GitHub:** `tasriba7/SI-LIPU`
- **Logo:** sudah final, ada di `public/logo-si-lipu.png` dalam repo — background navy,
  ikon rumah panggung + gelombang laut + mutiara emas, teks "SI-LIPU" + tagline.

## 2. Tujuan Besar Proyek

Platform digital terpadu ("satu sistem induk, banyak modul" — bukan aplikasi lepas-lepas)
untuk pemerintah desa, dipakai warga dengan **beragam latar belakang pendidikan** — jadi
**kemudahan pemakaian adalah prioritas nomor satu**, di atas kecanggihan fitur.

## 3. Keputusan Arsitektur Kunci (semua sudah disepakati pemilik proyek)

1. **Stack:** Next.js + Supabase (database & auth) + Vercel (hosting, free tier) + GitHub
   (version control, supaya proyek bisa lanjut lintas sesi AI/developer).
2. **Satu database, satu login** untuk semua modul — jangan bikin tabel data warga terpisah
   per modul.
3. **Modular:** setiap modul baru = folder baru, "nempel" ke sistem yang ada, bukan
   menggantikan modul yang sudah jalan.
4. **Nama desa tidak boleh di-hardcode** di kode — pakai konfigurasi/env var, supaya sistem
   bisa direplikasi ke desa lain tanpa bongkar kode, dan data antar-desa tetap terpisah
   (instance/database terpisah per desa, bukan berbagi satu database).
5. **Kredit originator wajib ada** di halaman publik (footer): *"SI-LIPU dikembangkan
   pertama kali untuk Desa Tatakalai, Kabupaten Banggai Kepulauan — digagas oleh
   Tasrib A. Abbas, S.AP."* — jangan dihapus tanpa izin pemilik proyek.

## 4. Fitur "Ajukan Layanan" (1-Klik) — Konsep Inti yang Diminta Pemilik Proyek

Warga (**tanpa login**) harus bisa mengajukan APAPUN jenis layanan desa lewat alur singkat:
**Beranda → tombol besar "Ajukan Layanan" → pilih ikon jenis layanan → isi form → dapat
kode tracking untuk cek status nanti.**

### Sub-keputusan penting di fitur ini:
- **Form Builder untuk admin**: admin (BUKAN developer) harus bisa menambah jenis layanan
  baru kapan saja lewat panel admin, sekaligus menentukan field apa saja yang perlu diisi
  warga dan mana yang wajib/opsional. Ini realisasinya berupa tabel `jenis_layanan_master`
  dengan kolom `form_schema` (JSON) yang berisi daftar field dinamis.
  **⚠️ STATUS: BELUM DIBANGUN.** Yang ada sekarang cuma modul Surat dengan jenis surat
  hardcode di `lib/jenisSurat.js` — developer harus edit kode manual untuk nambah jenis surat.
  **Ini prioritas utama yang harus dikerjakan berikutnya.**

- **Lookup data warga: NIK + Tanggal Lahir (dua faktor), BUKAN NIK saja**, dan BUKAN
  autocomplete. Alurnya: warga isi NIK + Tanggal Lahir lengkap → tekan tombol cari → kalau
  cocok, sistem tampilkan data TERSAMAR dulu ("Ta\*\*\*\* A. A\*\*\*\*, Dusun B\*\*\*\*.
  Apakah ini Anda?") → auto-fill penuh hanya setelah warga konfirmasi "Ya". Detail lengkap
  aturan keamanan (rate limiting, logging, field yang boleh/tidak boleh ikut auto-fill) ada
  di `docs/SECURITY.md`.
  **⚠️ STATUS: BELUM DIBANGUN.** Modul Kependudukan (tabel `warga`) belum ada sama sekali,
  jadi NIK di form Surat sekarang cuma field teks manual biasa tanpa lookup/verifikasi apapun.

## 5. Sistem Role & Pendaftaran Akun Perangkat Desa

- **Role tinggi (Kepala Desa, Sekretaris Desa, Kaur/Kasi):** akun dibuat LANGSUNG oleh admin,
  TIDAK ADA pendaftaran terbuka sama sekali.
- **Role banyak-slot per wilayah (Kadus, Ketua RT):** orangnya boleh **daftar sendiri**, TAPI
  sistem harus cek dulu: kalau slot wilayah itu (misal "Ketua RT 01/RW 02") sudah terisi,
  pendaftaran **ditolak otomatis saat submit** (tidak masuk antrian approval sama sekali).
  Kalau slot masih kosong, pendaftaran masuk status "pending" menunggu approval admin.
- **Mengganti pemegang slot** (misal RT lama diganti): **HANYA admin** yang bisa
  "mengosongkan slot" itu dulu, baru RT baru bisa mendaftar untuk slot yang sama.
- Detail skema tabel (`posisi_perangkat`, `pendaftaran_akun`) ada di `docs/DATABASE_SCHEMA.md`.

  **⚠️ STATUS: BELUM DIBANGUN.** Yang jalan sekarang: SEMUA role (termasuk Kadus) dibuat
  manual oleh admin lewat Supabase Dashboard, tidak ada pendaftaran mandiri sama sekali, dan
  role "Ketua RT" bahkan belum ada di sistem (cuma ada: kepala_desa, sekretaris_desa, kaur,
  kasi, kadus).

## 6. Branding & Visual

- **Warna:** biru navy (dominan), putih, kuning emas (aksen, terinspirasi mutiara — simbol
  resmi di lambang Kabupaten Banggai Kepulauan).
- **Logo:** rumah panggung (rumah khas desa pesisir) + gelombang laut + mutiara emas +
  teks "SI-LIPU" + tagline. Sudah final, file ada di repo.
- **Splash screen:** logo WAJIB tampil duluan setiap kali aplikasi dimuat, sebelum konten
  lain muncul. **✅ SUDAH DIBANGUN** (`components/SplashScreen.jsx`).

## 7. Progres Kode Aktual (per repo GitHub `tasriba7/SI-LIPU` — update 18 Agustus 2026)

**Update terbaru: ke-4 fitur prioritas di bawah SUDAH DIKERJAKAN** (sebelumnya berstatus
"belum dibangun" di ringkasan versi awal dokumen ini). Baca `docs/AI_HANDOFF.md` bagian
"STATUS TERKINI" untuk detail lengkap & TODO yang tersisa.

**Sudah selesai:**
- Fondasi Next.js + Supabase + Vercel-ready, splash screen, `/api/health`
- Login & dashboard perangkat desa (role: kepala_desa/sekretaris_desa/kaur/kasi/kadus/ketua_rt)
- Modul Pengajuan Surat lama (`/layanan/surat`) — tetap ada untuk kompatibilitas
- **Modul Kependudukan** (`/dashboard/kependudukan`) + lookup publik NIK+Tanggal Lahir
  dengan masking & rate limiting
- **Form Builder** (`/dashboard/jenis-layanan`) — admin bisa tambah jenis layanan + field
  dinamis sendiri; warga akses lewat `/layanan` (hub generik)
- **Sistem slot Kadus/Ketua RT** (`/dashboard/posisi`, `/pendaftaran`, `/dashboard/pendaftaran`)
- Kredit originator di footer

**TODO berikutnya (urutan disarankan):**
1. Migrasi data lama `pengajuan_surat` → `pengajuan_layanan` (opsional)
2. Import data warga massal dari Excel
3. Upload file/dokumen di form pengajuan (butuh Supabase Storage)
4. Modul Keuangan Desa/APBDes (Fase 3)
5. Edit/nonaktifkan data warga
6. Notifikasi WA/email otomatis

## 8. Cara Setup (Supabase & Vercel)

Langkah lengkap & terkini (pakai sistem API key Supabase terbaru: Publishable/Secret key,
bukan anon/service_role yang lama) sudah ada di `README.md` repo, bagian "Setup Supabase"
dan "Setup Vercel". Ikuti itu — jangan pakai instruksi env var lama dari `docs/ARCHITECTURE.md`
kalau ada perbedaan, karena README sudah disesuaikan dengan sistem key Supabase yang berlaku
saat ini (yang lama akan di-deprecate akhir 2026).

## 9. Aturan Kerja untuk AI Manapun yang Lanjutkan Proyek Ini

Aturan lengkap ada di `docs/AI_HANDOFF.md` bagian 2 ("Aturan yang Tidak Boleh Dilanggar").
Yang paling penting untuk diingat:
- Update `docs/AI_HANDOFF.md` bagian "STATUS TERKINI" SETIAP SELESAI kerja.
- Jangan hardcode nama desa di kode.
- Jangan hapus kredit originator.
- Ikuti `docs/SECURITY.md` untuk fitur apapun yang menyentuh data warga.
- Kalau ragu soal keputusan besar (ganti stack, ubah struktur database), TANYAKAN ke pemilik
  proyek dulu — jangan menebak/putuskan sepihak.
