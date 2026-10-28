-- 0068: Pilkades - usia minimum pemilih BISA diatur lagi (di menu Periksa Pemilih).
-- Idempotent. Prasyarat: 0065 sudah dijalankan.
--
-- 0065 mengunci usia_minimum = 17 lewat trigger. Trigger itu dilepas di sini.
-- Nilai diatur panitia lewat "Cara cepat: saring otomatis berdasarkan usia"
-- (fungsi pilkades_terapkan_usia sudah menyimpan nilainya ke pilkades_periode).
-- Rentang yang diterima: 15 sampai 30 tahun (bawaan tetap 17).
--
-- ROLLBACK:
--   alter table public.pilkades_periode drop constraint if exists pilkades_periode_usia_rentang;
--   (lalu jalankan ulang bagian 2 dari 0065 untuk mengunci kembali ke 17)

begin;

drop trigger if exists pilkades_periode_usia_17 on public.pilkades_periode;
drop function if exists public.pilkades_periode_usia_17();

alter table public.pilkades_periode drop constraint if exists pilkades_periode_usia_rentang;
alter table public.pilkades_periode
  add constraint pilkades_periode_usia_rentang check (usia_minimum between 15 and 30);

commit;
