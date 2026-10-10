-- 0035: Konten profil desa lengkap (sejarah, visi, misi, batas & luas wilayah)
-- untuk halaman publik /profil. Idempotent (aman dijalankan ulang).
-- Jalankan SETELAH 0033 (atau 0034 bila dipakai).
--
-- Keamanan: tabel config_desa sudah punya policy baca publik (anon boleh
-- SELECT) dan tulis hanya admin (adalah_admin) — kolom baru otomatis ikut
-- aturan itu, jadi TIDAK ada policy baru. Isinya memang konten publik; jangan
-- isi data pribadi di kolom-kolom ini.

begin;

alter table public.config_desa
  add column if not exists profil_sejarah text,
  add column if not exists profil_visi    text,
  add column if not exists profil_misi    text, -- satu poin per baris
  add column if not exists batas_utara    text,
  add column if not exists batas_selatan  text,
  add column if not exists batas_timur    text,
  add column if not exists batas_barat    text,
  add column if not exists luas_wilayah   text; -- teks bebas, mis. "12,5 km²"

-- Batas panjang di database (lapis kedua setelah validasi di server).
alter table public.config_desa
  drop constraint if exists config_desa_profil_panjang;
alter table public.config_desa
  add constraint config_desa_profil_panjang check (
    coalesce(char_length(profil_sejarah), 0) <= 8000
    and coalesce(char_length(profil_visi), 0) <= 1000
    and coalesce(char_length(profil_misi), 0) <= 4000
    and coalesce(char_length(batas_utara), 0) <= 200
    and coalesce(char_length(batas_selatan), 0) <= 200
    and coalesce(char_length(batas_timur), 0) <= 200
    and coalesce(char_length(batas_barat), 0) <= 200
    and coalesce(char_length(luas_wilayah), 0) <= 100
  );

commit;

-- ROLLBACK (hanya bila perlu; menghapus isian profil yang sudah tersimpan):
--   alter table public.config_desa
--     drop constraint if exists config_desa_profil_panjang,
--     drop column if exists profil_sejarah, drop column if exists profil_visi,
--     drop column if exists profil_misi,    drop column if exists batas_utara,
--     drop column if exists batas_selatan,  drop column if exists batas_timur,
--     drop column if exists batas_barat,    drop column if exists luas_wilayah;
