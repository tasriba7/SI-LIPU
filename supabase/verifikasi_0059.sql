-- Verifikasi 0059 (jalankan di Supabase SQL Editor setelah migrasi 0059).

-- 1. Tabel ada dan RLS aktif. Harus: ada 1 baris, rls_aktif = true.
select c.relname as tabel, c.relrowsecurity as rls_aktif
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'pilkades_panitia';

-- 2. Hak tabel untuk anon & authenticated. Harus: authenticated HANYA SELECT, anon kosong.
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'pilkades_panitia'
  and grantee in ('anon', 'authenticated')
order by grantee, privilege_type;

-- 3. Dua fungsi ada. Harus: 2 baris.
select proname
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in ('pilkades_simpan_panitia', 'pilkades_hapus_panitia');

-- 4. Indeks "satu jabatan per periode" ada. Harus: 1 baris.
select indexname from pg_indexes
where schemaname = 'public' and indexname = 'pilkades_panitia_satu_jabatan';
