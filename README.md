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

Fase 2, Modul 1 (Pengajuan Surat Online) — selesai:
- `/layanan/surat` — form publik ajukan surat (domisili, SKTM, dll.), **tanpa login**, hasilnya kode tracking unik (mis. `SRT-AB12CD`)
- `/layanan/surat/cek` — warga cek status pakai kode tracking lewat RPC terbatas (tidak expose NIK/data pribadi lain ke publik)
- `/dashboard/surat` — panel admin: daftar pengajuan + filter status, klik kode untuk lihat detail & ubah status/catatan
- Tabel `pengajuan_surat` + RLS (warga cuma bisa insert, staf login yang bisa lihat & update) + RPC `cek_status_pengajuan_surat` (`supabase/migrations/0003_pengajuan_surat.sql`)

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

6. Jalankan migrasi Fase 1, **urut sesuai nomor file**: buka **SQL Editor** di Supabase Dashboard → New query → copy-paste isi `supabase/migrations/0001_init_profiles.sql` → **Run**. Lalu New query lagi → copy-paste isi `supabase/migrations/0002_perangkat_desa_roles.sql` → **Run**. Migrasi kedua memperluas role jadi struktur perangkat desa (Kepala Desa, Sekretaris Desa, Kaur, Kasi, Kadus).

7. Buat akun perangkat desa: **Authentication → Users → Add user** → isi email & password → di kolom **User Metadata** (format JSON) isi misalnya:
   ```json
   { "nama": "Budi Santoso", "role": "kaur", "jabatan": "Kaur Keuangan" }
   ```
   Role yang valid: `kepala_desa`, `sekretaris_desa`, `kaur`, `kasi`, `kadus`. Untuk Kadus, tambahkan juga `"dusun": "Dusun 1"`. Centang **"Auto Confirm User"**, lalu baris profil otomatis terbuat sesuai metadata tadi. Kalau lupa isi metadata, role default jadi `kasi` — bisa diedit belakangan lewat Table Editor → `profiles`.

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
