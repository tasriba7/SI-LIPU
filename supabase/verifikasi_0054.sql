-- Verifikasi 0054. Hanya MEMBACA.
select tablename, rowsecurity from pg_tables
where schemaname = 'public' and tablename in ('pilkades_calon', 'pilkades_hadir');   -- 2 baris, true

select grantee, table_name, privilege_type from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'pilkades_hadir'
  and grantee in ('anon', 'authenticated');                                         -- hanya authenticated SELECT

select proname from pg_proc where pronamespace = 'public'::regnamespace
  and proname in ('pilkades_catat_hadir', 'pilkades_batal_hadir') order by 1;       -- 2 fungsi
