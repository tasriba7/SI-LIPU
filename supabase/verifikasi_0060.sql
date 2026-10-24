-- Verifikasi 0060. Hanya MEMBACA.
select tablename, rowsecurity from pg_tables
where schemaname = 'public' and tablename in ('pilkades_suara', 'pilkades_suara_tps', 'pilkades_hasil');  -- 3 baris, true

select grantee, table_name, privilege_type from information_schema.role_table_grants
where table_schema = 'public' and table_name in ('pilkades_suara', 'pilkades_suara_tps', 'pilkades_hasil')
  and grantee in ('anon', 'authenticated') order by 2, 1;     -- hanya authenticated SELECT (3 baris)

select proname from pg_proc where pronamespace = 'public'::regnamespace
  and proname in ('pilkades_simpan_suara', 'pilkades_tetapkan_terpilih', 'pilkades_batalkan_penetapan',
                  'pilkades_calon_kunci_suara') order by 1;     -- 4 fungsi

select tgname from pg_trigger where tgname = 'pilkades_calon_kunci_suara' and not tgisinternal;  -- 1 baris
