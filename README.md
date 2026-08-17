# SI-LIPU
**Sistem Informasi Layanan Interaktif Pelayanan Umum** — aplikasi layanan pemerintahan desa.

Fase 0: fondasi proyek. Sudah tersedia:
- Struktur proyek Next.js 14 (App Router)
- Koneksi Supabase (client, server, middleware refresh sesi)
- Splash screen logo saat aplikasi dimuat
- Endpoint `/api/health` untuk memverifikasi environment variable & koneksi Supabase
- Siap deploy ke Vercel

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
3. Setelah project selesai dibuat, buka **Project Settings → API**. Di situ ada 3 nilai yang dibutuhkan:

   | Nilai di Supabase | Nama env var di project ini |
   |---|---|
   | `Project URL` | `NEXT_PUBLIC_SUPABASE_URL` |
   | `anon` `public` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
   | `service_role` `secret` key | `SUPABASE_SERVICE_ROLE_KEY` |

4. Salin ketiganya ke `.env.local` (untuk lokal) mengikuti format di `.env.example`.

> ⚠️ **Penting soal `service_role` key**: key ini bisa melewati Row Level Security (RLS) dan punya akses penuh ke database. **Jangan pernah** memberi awalan `NEXT_PUBLIC_` padanya, jangan dipakai di Client Component, dan jangan di-commit ke git. Key ini hanya boleh dipakai di kode yang jalan di server (Server Action, Route Handler).

5. Aktifkan **Row Level Security (RLS)** di setiap tabel yang dibuat nanti (Table Editor → pilih tabel → Enable RLS), lalu buat policy sesuai kebutuhan (misalnya: warga hanya bisa lihat pengajuan surat miliknya sendiri, admin desa bisa lihat semua).

---

## 3. Setup Vercel

1. Push project ini ke GitHub (repo baru atau repo yang sudah Anda siapkan).
2. Buka [vercel.com](https://vercel.com) → **Add New → Project** → pilih repo GitHub tersebut → **Import**.
3. Framework Preset otomatis terdeteksi sebagai **Next.js** — tidak perlu diubah.
4. Sebelum klik Deploy, buka bagian **Environment Variables** dan tambahkan 3 variabel yang sama seperti di `.env.local`:

   | Key | Value | Environment |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | *(dari Supabase)* | Production, Preview, Development |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(dari Supabase)* | Production, Preview, Development |
   | `SUPABASE_SERVICE_ROLE_KEY` | *(dari Supabase)* | Production, Preview *(centang "Sensitive" kalau tersedia)* |

   Atau lewat Vercel CLI:
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   vercel env add SUPABASE_SERVICE_ROLE_KEY
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
│   ├── api/health/route.js   # cek koneksi Supabase
│   ├── layout.js              # bungkus semua halaman dengan SplashScreen
│   └── page.js                 # halaman utama (placeholder Fase 0)
├── components/
│   └── SplashScreen.jsx       # logo tampil duluan saat app dimuat
├── lib/supabase/
│   ├── client.js               # Supabase client (browser)
│   ├── server.js                # Supabase client (server)
│   └── middleware.js           # refresh sesi login
├── middleware.js
├── public/
│   └── logo-si-lipu.png
├── styles/globals.css
├── .env.example
└── README.md
```

## 6. Fase selanjutnya (belum dibuat di Fase 0 ini)

Berdasarkan diskusi sebelumnya, kandidat modul untuk desa (Pemdes) yang bisa ditambahkan di fase berikutnya:
- Autentikasi warga & admin desa (Supabase Auth)
- Pengajuan surat online (surat keterangan domisili, SKTM, dll.) + tracking status
- Pengaduan/aspirasi warga
- Informasi & pengumuman desa
- Profil desa & data statistik penduduk

Beri tahu modul mana yang mau dikerjakan duluan untuk lanjut ke Fase 1.
