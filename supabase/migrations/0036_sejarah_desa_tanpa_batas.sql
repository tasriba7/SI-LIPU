-- 0036: Hapus batas 8.000 karakter pada kolom sejarah desa (profil_sejarah).
-- Idempotent (aman dijalankan ulang). Jalankan SETELAH 0035.
--
-- Kolom bertipe text di Postgres tidak punya batas panjang bawaan; batas hanya
-- datang dari constraint yang dibuat di 0035. Constraint dibuat ulang TANPA
-- profil_sejarah. Batas untuk visi, misi, batas wilayah, dan luas tetap ada.

begin;

alter table public.config_desa
  drop constraint if exists config_desa_profil_panjang;

alter table public.config_desa
  add constraint config_desa_profil_panjang check (
    coalesce(char_length(profil_visi), 0) <= 1000
    and coalesce(char_length(profil_misi), 0) <= 4000
    and coalesce(char_length(batas_utara), 0) <= 200
    and coalesce(char_length(batas_selatan), 0) <= 200
    and coalesce(char_length(batas_timur), 0) <= 200
    and coalesce(char_length(batas_barat), 0) <= 200
    and coalesce(char_length(luas_wilayah), 0) <= 100
  );

commit;

-- ROLLBACK (hanya bila perlu; gagal bila sejarah yang tersimpan sudah > 8000):
--   alter table public.config_desa drop constraint if exists config_desa_profil_panjang;
--   alter table public.config_desa add constraint config_desa_profil_panjang check (
--     coalesce(char_length(profil_sejarah), 0) <= 8000
--     and coalesce(char_length(profil_visi), 0) <= 1000
--     and coalesce(char_length(profil_misi), 0) <= 4000
--     and coalesce(char_length(batas_utara), 0) <= 200
--     and coalesce(char_length(batas_selatan), 0) <= 200
--     and coalesce(char_length(batas_timur), 0) <= 200
--     and coalesce(char_length(batas_barat), 0) <= 200
--     and coalesce(char_length(luas_wilayah), 0) <= 100
--   );
