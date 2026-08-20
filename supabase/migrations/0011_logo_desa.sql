-- Fase 2 - Tambahan: Logo Desa (identitas visual desa, terpisah dari foto
-- latar beranda di kolom foto_url). Dipakai di header publik
-- (components/PublicHeader.jsx) & lambang beranda (components/VillageSeal.jsx).
-- Kalau admin belum unggah logo desa, sistem tetap pakai logo aplikasi
-- SI-LIPU bawaan (public/logo-si-lipu.png) sebagai default — lihat kedua
-- komponen di atas untuk logika fallback-nya.
-- Jalankan SETELAH 0010.

alter table public.config_desa
  add column if not exists logo_url text; -- URL publik logo desa (bucket "desa-media", sama seperti foto_url)

-- Tidak perlu bucket/policy storage baru — logo memakai bucket "desa-media"
-- yang sudah publik & sudah punya policy upload/update/delete untuk staf
-- (lihat 0010_config_desa.sql).
