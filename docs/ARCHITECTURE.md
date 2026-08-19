> ⚠️ **Dokumen ini adalah RENCANA/tujuan akhir, bukan cerminan kode yang sudah jalan.**
> Untuk status implementasi sebenarnya & penyimpangan yang sudah terjadi, baca dulu
> bagian **PENYIMPANGAN DARI RENCANA** di `AI_HANDOFF.md`.

# ARCHITECTURE.md — Stack & Struktur Teknis

## Stack yang Dipakai
- **Frontend + Backend API:** Next.js (App Router) — satu framework untuk keduanya
- **Database & Auth:** Supabase (PostgreSQL + Auth bawaan, free tier)
- **Hosting:** Vercel (free tier, auto-deploy dari GitHub)
- **Version control:** GitHub

Alasan pemilihan ada di README.md. Jangan ganti stack tanpa konfirmasi ke pemilik proyek
(lihat aturan #2 di AI_HANDOFF.md).

## Struktur Folder (target)
```
sid-desa/
├── docs/                     # dokumentasi (JANGAN dihapus)
├── app/
│   ├── (auth)/                # halaman login
│   ├── (dashboard)/
│   │   ├── surat/              # modul surat-menyurat
│   │   ├── keuangan/           # modul APBDes
│   │   ├── kependudukan/       # modul data warga
│   │   └── layout.tsx          # sidebar/header bersama semua modul
│   └── api/                   # API routes per modul
├── components/
│   ├── ui/                    # komponen dipakai bareng (tombol, tabel, form)
│   └── layout/                # header, sidebar, navigasi
├── lib/
│   ├── supabase.ts             # koneksi database
│   └── auth.ts                 # helper role & permission
└── .env.local                 # kredensial (JANGAN dicommit ke GitHub)
```

## Prinsip Modular
- Setiap modul baru = 1 folder baru di `app/(dashboard)/nama-modul/`
- Modul BOLEH baca tabel master (Warga, Perangkat Desa) tapi TIDAK BOLEH bikin tabel duplikat sendiri
- Komponen UI umum (tombol, tabel, form) taruh di `components/ui/`, dipakai ulang semua modul —
  jangan bikin versi baru per modul

## Role & Hak Akses (rencana)
Role dasar yang harus didukung sejak awal:
- **Kepala Desa** — akses penuh, approval tertinggi
- **Sekretaris Desa** — akses hampir penuh, approval surat/keuangan
- **Kaur/Kasi** (per bidang) — akses modul sesuai bidang
- **Kadus** — akses terbatas ke wilayahnya
- **Operator** — input data harian (surat, penduduk)
- **Warga (opsional, fase lanjut)** — hanya bisa ajukan surat & lihat status

## Menu "Ajukan Layanan" (fitur 1-klik untuk warga)
Ini BUKAN modul terpisah, tapi **pintu masuk universal** ke semua jenis layanan desa,
dan harus jadi elemen paling menonjol di halaman depan aplikasi (untuk warga, tanpa login).

**Alur (harus tetap 3 langkah, jangan ditambah tanpa alasan kuat):**
1. Beranda → tombol besar selalu terlihat: **"Ajukan Layanan"**
2. Grid ikon jenis layanan (data dari tabel `jenis_layanan_master`) → warga tap satu ikon
3. Form: input **NIK** → sistem auto-lookup ke tabel `warga`, isi otomatis nama/alamat jika
   ditemukan (fallback: isi manual jika NIK belum terdata) → isi field tambahan sesuai
   `form_schema` jenis layanan tsb → submit

⚠️ **Kunci lookup wajib NIK + Tanggal Lahir (dua faktor), bukan NIK saja, dan data hasil
lookup wajib tersamar dulu untuk konfirmasi sebelum auto-fill penuh — lihat aturan lengkap &
wajib di `SECURITY.md`, jangan diimplementasi tanpa membaca dokumen itu.**

Setelah submit: tampilkan **kode pengajuan** (format `PL-YYYYMMDD-####`) besar & jelas, dengan
tombol "Simpan/Screenshot". Ini SATU-SATUNYA cara warga cek status tanpa login — jadi harus
ditampilkan dengan sangat jelas, jangan sampai warga kehilangan kodenya.

**Halaman terpisah "Cek Status Pengajuan":**
- Input: kode pengajuan ATAU (NIK + nomor HP) sebagai verifikasi
- Tampilkan status terkini + catatan petugas (jika ada)

**Sisi admin (perangkat desa):**
- Semua `pengajuan_layanan` masuk ke satu inbox terpusat, bisa difilter per jenis/status
- Approval → jika jenisnya "surat", sistem auto-generate record baru di tabel `surat`
  (jangan input manual ulang data yang sama)

## Alur Pendaftaran & Manajemen Akun Perangkat Desa

**Role tunggal se-desa (Kepala Desa, Sekdes, Kaur/Kasi):**
- TIDAK ADA pendaftaran terbuka sama sekali.
- Admin login → menu "Kelola Perangkat" → "+ Tambah Perangkat" → input data langsung → akun
  langsung aktif (atau kirim link aktivasi ke nomor HP/email yang didaftarkan).

**Role banyak-slot per wilayah (Kadus, Ketua RT):**
1. Sistem sudah punya daftar slot kosong di `posisi_perangkat` (admin isi dulu daftar RT/Dusun
   yang ada di desa, sebelum dibuka pendaftaran).
2. Calon Ketua RT buka halaman pendaftaran → pilih wilayahnya (RT/RW mana) → isi data diri.
3. **Sistem cek slot itu dulu:**
   - Kalau **kosong** → pendaftaran masuk `pendaftaran_akun` dengan status `pending` → admin
     dapat notifikasi untuk approve.
   - Kalau **sudah terisi** → **ditolak otomatis saat itu juga**, tidak masuk antrian approval
     sama sekali. Pesan: "Slot Ketua RT [wilayah] sudah terisi, hubungi admin desa."
4. Admin approve → sistem otomatis: buat akun di `perangkat_desa`, update `posisi_perangkat`
   jadi `status: terisi` + isi `perangkat_desa_id`.

**Mengganti pemegang slot (misal RT lama diganti RT baru):**
- **HANYA admin** yang bisa lakukan ini — tidak ada jalur lain.
- Admin buka slot RT terkait → klik **"Kosongkan Slot"** → sistem set `status: kosong`, catat
  `dikosongkan_oleh` + `dikosongkan_pada`, dan (opsional, sesuai kebijakan) nonaktifkan akun
  lama di `perangkat_desa`.
- Setelah slot kosong, RT baru baru bisa mendaftar lewat alur normal di atas.


Admin (bukan developer) harus bisa menambah jenis layanan baru kapan saja, lengkap dengan
field apa saja yang perlu diisi warga — tanpa perlu deploy ulang kode.

**Alur di admin:**
1. Menu "Kelola Jenis Layanan" → tombol "+ Tambah Jenis Layanan"
2. Isi info dasar: nama layanan, kategori, pilih ikon (dari daftar ikon siap pakai)
3. Susun field tambahan satu per satu lewat tombol "+ Tambah Field":
   - Nama field (label yang dilihat warga)
   - Tipe input: teks pendek / teks panjang / angka / tanggal / pilihan (dropdown) / upload file
   - Toggle **Wajib / Opsional**
   - Jika tipe "pilihan" → admin isi daftar opsinya
4. Preview form persis seperti tampilan warga, sebelum disimpan
5. Simpan → tersimpan sebagai `form_schema` (lihat struktur JSON di `DATABASE_SCHEMA.md`) di
   tabel `jenis_layanan_master`, langsung muncul di grid ikon warga

**Field standar (NIK, Nama, Nomor HP) SELALU otomatis ada** di semua jenis layanan — bagian
dari sistem inti, admin tidak perlu menambahkannya manual.

**Validasi wajib di sisi Frontend saat render form warga:**
- Field dengan `wajib: true` tidak boleh dikosongkan sebelum submit
- Render tipe input sesuai `tipe` di schema (dropdown untuk "pilihan", date picker untuk
  "tanggal", dst) — form builder generik ini yang membuat sistem scalable tanpa ubah kode tiap
  ada jenis layanan baru.

## Environment Variables yang Dibutuhkan
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```
Simpan nilai asli di Vercel dashboard & `.env.local` lokal — JANGAN pernah commit ke GitHub.
