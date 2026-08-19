# SI-LIPU
**Sistem Informasi Layanan Interaktif Pelayanan Umum** — aplikasi layanan pemerintahan desa.

> **Catatan penting:** warga desa **tidak perlu login**. Layanan publik
> (pengajuan surat, pengaduan, dll.) di fase berikutnya diakses lewat form
> terbuka. Login hanya untuk **admin/petugas desa** yang mengelola data.

Fase 0 (fondasi proyek) — selesai:
- Struktur proyek Next.js 15 (App Router)
- Koneksi Supabase (client, server, middleware refresh sesi) — pakai sistem API key **baru** (Publishable/Secret)
- Splash screen logo saat aplikasi dimuat
- Endpoint `/api/health` untuk memverifikasi environment variable & koneksi Supabase
- Siap deploy ke Vercel

Fase 1 (autentikasi perangkat desa) — selesai:
- Halaman `/login` khusus perangkat desa (tanpa pendaftaran publik)
- Dashboard `/dashboard` — sidebar navigasi, kartu statistik, grid modul; terproteksi, redirect ke `/login` kalau belum masuk
- Struktur role sesuai perangkat desa: **Kepala Desa, Sekretaris Desa, Kaur, Kasi, Kadus** (lihat `lib/roles.js`)
- Tabel `profiles` + RLS + trigger otomatis di Supabase (`supabase/migrations/0001_init_profiles.sql` lalu `0002_perangkat_desa_roles.sql`)
- Akun perangkat desa dibuat **manual** oleh superadmin lewat Supabase Dashboard, bukan lewat form pendaftaran

Fase 2, Modul 1 (Pengajuan Surat Online — versi awal) — selesai, tapi lihat catatan di bawah:
- `/layanan/surat` — form publik ajukan surat (domisili, SKTM, dll.), **tanpa login**, hasilnya kode tracking unik (mis. `SRT-AB12CD`). **Halaman ini TETAP dipertahankan untuk kompatibilitas**, tapi BUKAN lagi jalur utama — lihat Modul 2-4 di bawah.
- `/layanan/surat/cek` — warga cek status pakai kode tracking lewat RPC terbatas (tidak expose NIK/data pribadi lain ke publik)
- `/dashboard/surat` — panel admin: daftar pengajuan + filter status, klik kode untuk lihat detail & ubah status/catatan
- Tabel `pengajuan_surat` + RLS (warga cuma bisa insert, staf login yang bisa lihat & update) + RPC `cek_status_pengajuan_surat` (`supabase/migrations/0003_pengajuan_surat.sql`)

Fase 2, Modul 2 (Data Kependudukan) — selesai:
- Tabel `warga` — master data kependudukan, hanya bisa diakses staf yang login (RLS)
- `/dashboard/kependudukan` — daftar & pencarian warga; `/dashboard/kependudukan/baru` — tambah data
- RPC `cari_warga_publik` — lookup **dua faktor (NIK + Tanggal Lahir)** untuk warga publik, TANPA autocomplete, hasil terbatas (nama, dusun, RT/RW saja), dengan rate limiting (`hitung_percobaan_gagal`) dan log audit (`log_pencarian_warga`). Aturan lengkap: `docs/SECURITY.md`.
- Migrasi: `supabase/migrations/0004_kependudukan.sql`

Fase 2, Modul 3 (Form Builder — "Ajukan Layanan" generik) — selesai:
- `/dashboard/jenis-layanan` — admin lihat & aktifkan/nonaktifkan jenis layanan; `/dashboard/jenis-layanan/baru` — admin **susun jenis layanan baru sendiri**: nama, kategori, ikon, prefix kode tracking, dan field tambahan dinamis (teks/angka/tanggal/pilihan, wajib/opsional) — **tanpa perlu developer atau deploy ulang**
- `/layanan` — warga lihat grid semua jenis layanan aktif; `/layanan/ajukan/[id]` — form dinamis (lookup NIK+Tanggal Lahir dulu kalau diaktifkan, lalu field sesuai jenis layanan)
- `/layanan/cek` — cek status, kompatibel dengan kode tracking dari sistem lama maupun baru
- `/dashboard/layanan` — inbox admin generik untuk semua jenis layanan
- Tabel `jenis_layanan_master` + `pengajuan_layanan` + RPC `cek_status_pengajuan_layanan`, sudah diisi data awal (jenis surat yang ada + Pengaduan Warga). Migrasi: `supabase/migrations/0005_form_builder_layanan.sql`

Fase 1c (Sistem Slot Kadus & Ketua RT) — selesai:
- `/dashboard/posisi` — admin daftarkan wilayah (dusun/RT-RW) sebagai slot kosong
- `/pendaftaran` — calon Kadus/Ketua RT daftar mandiri, memilih wilayahnya; **otomatis ditolak lewat trigger database** kalau slot itu sudah terisi
- `/dashboard/pendaftaran` — admin approve (otomatis buat akun Supabase Auth + kunci slot) atau tolak
- Hanya admin yang bisa "Kosongkan Slot" (di `/dashboard/posisi`) untuk membuka slot itu lagi
- Migrasi: `supabase/migrations/0006_posisi_dan_pendaftaran.sql`
- **Kepala Desa/Sekretaris Desa/Kaur/Kasi TETAP dibuat manual oleh admin** lewat Supabase Dashboard (tidak berubah)

---

## 1. Jalankan di lokal

```bash
npm install
cp .env.example .env.local
# lalu isi .env.local sesuai langkah di bagian "Setup Supabase" di bawah
npm run dev
```

Buka `http://localhost:3000` — splash screen logo SI-LIPU akan muncul dulu sebelum halaman utama tampil.

Cek koneksi Supabase: buka `http://localhost:3000/api/health` — harus muncul `{"ok": true, ...}`.

---

## 2. Setup Supabase

1. Buka [supabase.com](https://supabase.com) → **New Project**.
2. Beri nama project (misalnya `si-lipu-prod`), pilih region terdekat (Singapore paling dekat untuk Indonesia), dan set password database (simpan baik-baik, dipakai untuk akses DB langsung).
3. Setelah project selesai dibuat, buka **Project Settings → API Keys**. Pastikan berada di tab **"Publishable and secret API keys"** (bukan tab "Legacy anon, service_role API keys" — key lama akan di-deprecate akhir 2026, jangan dipakai untuk project baru). Di situ ada 3 nilai yang dibutuhkan:

   | Nilai di Supabase | Nama env var di project ini |
   |---|---|
   | `Project URL` (di bagian atas halaman API) | `NEXT_PUBLIC_SUPABASE_URL` |
   | **Publishable key** (`sb_publishable_...`) | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
   | **Secret key** (`sb_secret_...`, klik "Reveal") | `SUPABASE_SECRET_KEY` |

4. Salin ketiganya ke `.env.local` (untuk lokal) mengikuti format di `.env.example`.

> ⚠️ **Penting soal Secret key**: key ini bisa melewati Row Level Security (RLS) dan punya akses penuh ke database. **Jangan pernah** memberi awalan `NEXT_PUBLIC_` padanya, jangan dipakai di Client Component, dan jangan di-commit ke git. Key ini hanya boleh dipakai di kode yang jalan di server (Server Action, Route Handler). Supabase juga memblokir pemakaian Secret key dari browser (dideteksi lewat User-Agent) — jadi kalau salah taruh, biasanya langsung gagal dengan error, bukan diam-diam bocor.

5. Aktifkan **Row Level Security (RLS)** di setiap tabel yang dibuat nanti (Table Editor → pilih tabel → Enable RLS), lalu buat policy sesuai kebutuhan.

6. Jalankan migrasi **urut sesuai nomor file** di **SQL Editor** Supabase Dashboard (New query → paste isi file → Run, satu per satu):
   - `0001_init_profiles.sql`
   - `0002_perangkat_desa_roles.sql` — memperluas role jadi struktur perangkat desa
   - `0003_pengajuan_surat.sql` — modul surat versi awal (tetap dipertahankan untuk kompatibilitas)
   - `0004_kependudukan.sql` — tabel warga + lookup aman NIK+Tanggal Lahir
   - `0005_form_builder_layanan.sql` — Form Builder (`jenis_layanan_master` + `pengajuan_layanan`)
   - `0006_posisi_dan_pendaftaran.sql` — sistem slot Kadus/Ketua RT

   ⚠️ Migrasi 0004-0006 BARU (belum pernah dijalankan kalau project Supabase Anda baru
   pertama kali setup dari repo ini). Kalau Anda sudah pernah menjalankan 0001-0003
   sebelumnya, tinggal lanjutkan dari 0004.

7. Buat akun perangkat desa: **Authentication → Users → Add user** → isi email & password → di kolom **User Metadata** (format JSON) isi misalnya:
   ```json
   { "nama": "Budi Santoso", "role": "kaur", "jabatan": "Kaur Keuangan" }
   ```
   Role yang valid: `kepala_desa`, `sekretaris_desa`, `kaur`, `kasi`, `kadus`, `ketua_rt`. Untuk Kadus, tambahkan juga `"dusun": "Dusun 1"`. Centang **"Auto Confirm User"**, lalu baris profil otomatis terbuat sesuai metadata tadi. Kalau lupa isi metadata, role default jadi `kasi` — bisa diedit belakangan lewat Table Editor → `profiles`.

   > Khusus **Kadus & Ketua RT**, cara di atas cuma untuk akun pertama/darurat. Alur normalnya: admin isi wilayah kosong di `/dashboard/posisi`, lalu calon Kadus/RT daftar mandiri di `/pendaftaran`, admin tinggal approve di `/dashboard/pendaftaran` — akun otomatis terbuat, tidak perlu ke Supabase Dashboard.

---

## 3. Setup Vercel

1. Push project ini ke GitHub (repo baru atau repo yang sudah Anda siapkan).
2. Buka [vercel.com](https://vercel.com) → **Add New → Project** → pilih repo GitHub tersebut → **Import**.
3. Framework Preset otomatis terdeteksi sebagai **Next.js** — tidak perlu diubah.
4. Sebelum klik Deploy, buka bagian **Environment Variables** dan tambahkan 3 variabel yang sama seperti di `.env.local`:

   | Key | Value | Environment |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | *(dari Supabase)* | Production, Preview, Development |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | *(dari Supabase, `sb_publishable_...`)* | Production, Preview, Development |
   | `SUPABASE_SECRET_KEY` | *(dari Supabase, `sb_secret_...`)* | Production, Preview *(centang "Sensitive" kalau tersedia)* |

   Atau lewat Vercel CLI:
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
   vercel env add SUPABASE_SECRET_KEY
   ```

5. Klik **Deploy**. Setelah selesai, cek `https://<nama-project>.vercel.app/api/health` untuk memastikan koneksi Supabase berhasil di production.

6. **Kalau nanti mengubah env variable di Vercel**, wajib **Redeploy** — Vercel tidak otomatis apply env var baru ke deployment yang sudah jalan.

---

## 4. Upload logo ke GitHub (manual)

Logo sudah otomatis diletakkan di `public/logo-si-lipu.png` di dalam project ini. Kalau Anda upload manual ke GitHub, pastikan:
- Nama file & lokasinya tetap `public/logo-si-lipu.png` (dipakai langsung oleh `SplashScreen.jsx`, `app/layout.js` untuk favicon, dan `app/page.js`), **atau**
- Kalau nama/lokasinya beda, update path-nya di 3 file tersebut.

---

## 5. Struktur proyek

```
si-lipu/
├── app/
│   ├── api/health/route.js    # cek koneksi Supabase
│   ├── dashboard/
│   │   ├── layout.js           # cek auth + fetch profil, bungkus dgn sidebar
│   │   ├── page.js             # isi dashboard: stat cards + grid modul
│   │   └── actions.js          # server action logout
│   ├── login/
│   │   ├── page.js             # form login perangkat desa
│   │   └── actions.js          # server action login
│   ├── layout.js               # bungkus semua halaman dengan SplashScreen
│   └── page.js                  # halaman utama publik
├── components/
│   ├── SplashScreen.jsx        # logo tampil duluan saat app dimuat
│   ├── icons.jsx                # ikon SVG inline dashboard
│   └── dashboard/
│       └── DashboardShell.jsx  # sidebar + header dashboard (client)
├── lib/
│   ├── roles.js                 # label & warna badge per role perangkat desa
│   └── supabase/
│       ├── client.js             # Supabase client (browser)
│       ├── server.js              # Supabase client (server)
│       └── middleware.js          # refresh sesi + proteksi /dashboard
├── supabase/migrations/
│   ├── 0001_init_profiles.sql   # tabel profiles, RLS, trigger akun staf
│   └── 0002_perangkat_desa_roles.sql  # perluas role jadi struktur perangkat desa
├── middleware.js
├── public/
│   └── logo-si-lipu.png
├── styles/globals.css
├── .env.example
└── README.md
```

## 6. Fase selanjutnya (belum dibuat)

Modul yang masih tersisa dari rencana Fase 2 — semuanya diakses **warga
tanpa login**, memakai form terbuka + kode tracking untuk cek status,
pola yang sama seperti Modul 1 (Pengajuan Surat) di atas:
- Pengaduan/aspirasi warga
- Informasi & pengumuman desa
- Profil desa & data statistik penduduk (Data Kependudukan)

Jalankan migrasi `supabase/migrations/0003_pengajuan_surat.sql` di Supabase
Dashboard (SQL Editor) sebelum mencoba modul Pengajuan Surat di lokal/production.
