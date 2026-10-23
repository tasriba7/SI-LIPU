-- 0053: Cabut hak tabel yang tidak dipakai aplikasi (temuan audit).
-- AMAN dijalankan sekarang: hanya mencabut TRUNCATE, TRIGGER, REFERENCES dari
-- anon & authenticated. Aplikasi tidak memakai hak itu (browser hanya SELECT
-- config_desa; sisanya lewat server dengan SELECT/INSERT/UPDATE/DELETE + RLS).
-- service_role TIDAK disentuh. Idempotent. Jalankan SETELAH 0052.
--
-- Mengapa penting: RLS tidak berlaku untuk TRUNCATE. Selama hak itu ada,
-- siapa pun yang memegang kunci anon/akun login bisa mengosongkan tabel lewat
-- API tanpa terhalang policy apa pun.
--
-- Sengaja TIDAK dilakukan di sini (butuh pengujian terpisah):
--   - FORCE ROW LEVEL SECURITY: fungsi SECURITY DEFINER (mis. pengambilan
--     calon pemilih) berjalan sebagai pemilik tabel dan bergantung pada bypass
--     RLS; FORCE akan merusaknya.
--   - Mencabut INSERT/UPDATE/DELETE anon per tabel: perlu daftar tabel yang
--     memang menerima kiriman publik (lihat verifikasi_0053.sql bagian 3).

begin;

do $$
declare
  r record;
begin
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
  loop
    execute format(
      'revoke truncate, trigger, references on table public.%I from anon, authenticated',
      r.relname
    );
  end loop;
end $$;

-- Tabel yang dibuat nanti (oleh pemilik default) tidak lagi mewarisi hak itu.
alter default privileges in schema public
  revoke truncate, trigger, references on tables from anon, authenticated;

commit;
