-- Verifikasi 0062. Hanya MEMBACA.
select tablename, rowsecurity from pg_tables
where schemaname = 'public' and tablename = 'pilkades_jadwal';                 -- 1 baris, true

select grantee, privilege_type from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'pilkades_jadwal'
  and grantee in ('anon', 'authenticated');                                    -- hanya authenticated SELECT

select proname from pg_proc
where pronamespace = 'public'::regnamespace and proname = 'pilkades_simpan_jadwal';  -- 1 fungsi
