-- Verifikasi migrasi 0033 (pindah keluar, datang, ringkasan per bulan).
-- Jalankan di Supabase SQL Editor. Semua query hanya MEMBACA.

-- 1. Kolom baru ada (harus 1 baris)
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'mutasi_penduduk' and column_name = 'asal_tujuan';

-- 2. Fungsi terpasang (harus 4 baris)
select proname from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in ('catat_pindah_keluar', 'catat_datang', 'batalkan_mutasi', 'ringkasan_mutasi_bulanan')
order by 1;

-- 3. Hak eksekusi: anon TIDAK boleh (semua kolom anon_bisa harus false)
select p.proname,
       has_function_privilege('anon', p.oid, 'execute') as anon_bisa,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated_bisa
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in ('catat_pindah_keluar', 'catat_datang', 'batalkan_mutasi', 'ringkasan_mutasi_bulanan')
order by 1;

-- 4. Jumlah penduduk di statistik harus sama dengan jumlah warga AKTIF
select
  (select total_penduduk from public.statistik_beranda()) as total_di_statistik,
  (select count(*) from public.warga where status_kependudukan = 'aktif') as total_aktif;

-- 5. Ringkasan jumlah warga per status (aktif / meninggal / pindah)
select status_kependudukan, count(*) as jumlah
from public.warga
group by 1
order by 1;

-- 6. Ringkasan catatan mutasi yang berlaku, per jenis
select jenis, count(*) as jumlah
from public.mutasi_penduduk
where dibatalkan_pada is null
group by 1
order by 1;

-- 7. Kekonsistenan (keduanya harus 0 baris):
--    a. warga berstatus 'pindah' yang sama sekali tidak punya catatan mutasi
select w.nik, w.nama_lengkap
from public.warga w
where w.status_kependudukan = 'pindah'
  and not exists (select 1 from public.mutasi_penduduk m where m.warga_id = w.id);
--    b. warga berstatus 'meninggal' tanpa catatan meninggal yang berlaku
select w.nik, w.nama_lengkap
from public.warga w
where w.status_kependudukan = 'meninggal'
  and not exists (
    select 1 from public.mutasi_penduduk m
    where m.warga_id = w.id and m.jenis = 'meninggal' and m.dibatalkan_pada is null
  );
