-- Fase 2 - Tambahan: Profil Kepala Desa (nama, foto, sambutan) untuk
-- ditampilkan di beranda publik. Sama seperti logo_url (0011), disimpan
-- langsung di config_desa karena sifatnya masih identitas tunggal per
-- instance (satu desa = satu Kepala Desa aktif), diisi ADMIN lewat
-- /dashboard/pengaturan-desa. Kalau ke depan perlu riwayat pergantian
-- Kepala Desa dari waktu ke waktu, baru pertimbangkan tabel terpisah.
-- Jalankan SETELAH 0010-0013.

alter table public.config_desa
  add column if not exists kepala_desa_nama text,
  add column if not exists kepala_desa_foto_url text, -- bucket "desa-media", sama seperti foto_url/logo_url
  add column if not exists kepala_desa_sambutan text;

-- Tidak perlu bucket/policy storage baru — foto Kepala Desa memakai bucket
-- "desa-media" yang sudah publik & sudah punya policy upload/update/delete
-- untuk staf (lihat 0010_config_desa.sql).
