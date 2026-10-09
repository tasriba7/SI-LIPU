-- Verifikasi migrasi 0032 (status penduduk + mutasi). Jalankan di Supabase SQL Editor.
-- Semua query hanya MEMBACA, kecuali bagian UJI yang di-ROLLBACK (tidak menyimpan apa pun).

-- 1. Kolom baru ada, dan semua warga lama berstatus aktif
select status_kependudukan, count(*) as jumlah
from public.warga
group by 1
order by 1;

-- 2. Tabel mutasi ada & RLS aktif (rowsecurity harus true)
select tablename, rowsecurity
from pg_tables
where schemaname = 'public' and tablename = 'mutasi_penduduk';

-- 3. Fungsi & trigger terpasang (harus 2 fungsi mutasi + 1 trigger kunci)
select proname from pg_proc
where pronamespace = 'public'::regnamespace and proname in ('tandai_meninggal', 'batalkan_mutasi')
order by 1;

select tgname from pg_trigger
where tgrelid = 'public.warga'::regclass and tgname = 'kunci_status_penduduk_trigger';

-- 4. Jumlah penduduk di statistik harus sama dengan jumlah warga AKTIF
select
  (select total_penduduk from public.statistik_beranda()) as total_di_statistik,
  (select count(*) from public.warga where status_kependudukan = 'aktif') as total_aktif;

-- 5. UJI (di-rollback): tandai satu warga meninggal lalu lihat jumlahnya berkurang 1.
--    Di SQL Editor tidak ada sesi login (auth.uid() null), jadi trigger kunci mengizinkan.
begin;
  with satu as (select id from public.warga where status_kependudukan = 'aktif' limit 1)
  update public.warga w
     set status_kependudukan = 'meninggal', tanggal_status = current_date
    from satu where w.id = satu.id;

  select (select total_penduduk from public.statistik_beranda()) as total_setelah_ditandai;
rollback;
