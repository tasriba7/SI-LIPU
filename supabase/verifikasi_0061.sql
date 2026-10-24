-- Verifikasi 0061. Hanya MEMBACA.
select tablename, rowsecurity from pg_tables
where schemaname = 'public' and tablename = 'pilkades_logo';                 -- 1 baris, true

select grantee, privilege_type from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'pilkades_logo'
  and grantee in ('anon', 'authenticated');                                  -- hanya authenticated SELECT

select id, public from storage.buckets where id = 'pilkades-logo';           -- 1 baris, public = false

select policyname from pg_policies
where schemaname = 'storage' and tablename = 'objects' and policyname like '%logo%'
order by 1;                                                                   -- 4 baris (lihat, unggah, ubah, hapus) + milik modul lain bila namanya mengandung "logo"

select proname from pg_proc
where pronamespace = 'public'::regnamespace and proname = 'pilkades_simpan_logo';  -- 1 fungsi
