-- Verifikasi 0053. Semua query hanya MEMBACA.

-- 1. Harus 0 baris: tidak ada lagi TRUNCATE/TRIGGER/REFERENCES untuk anon/authenticated
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
  and privilege_type in ('TRUNCATE', 'TRIGGER', 'REFERENCES');

-- 2. service_role masih utuh (harus ada baris, mis. TRUNCATE)
select count(*) as hak_service_role
from information_schema.role_table_grants
where table_schema = 'public' and grantee = 'service_role';

-- 3. Untuk tahap berikutnya: tabel yang masih bisa ditulis anon (INSERT/UPDATE/DELETE).
--    Kirim hasilnya; tabel di luar form publik (pendaftaran, aduan, dsb.) bisa dicabut.
select table_name, string_agg(privilege_type, ', ' order by privilege_type) as hak_anon
from information_schema.role_table_grants
where table_schema = 'public' and grantee = 'anon'
  and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
group by 1
order by 1;

-- 4. Status RLS semua tabel (rowsecurity harus true di tabel berisi data warga)
select tablename, rowsecurity from pg_tables where schemaname = 'public' order by 1;
