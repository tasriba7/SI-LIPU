-- Hanya MEMBACA. Jalankan setelah 0028 / 0029, lalu kirim hasilnya (satu blok JSON).
select jsonb_pretty(jsonb_build_object(

'rpc_publik_masih_terbuka_untuk_anon', (
  select coalesce(jsonb_agg(p.oid::regprocedure::text), '[]'::jsonb)
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and p.proname in ('cari_warga_publik','riwayat_pengajuan_publik','hitung_percobaan_gagal')
    and has_function_privilege('anon', p.oid, 'execute')),

'policy_insert_publik', (
  select coalesce(jsonb_agg(jsonb_build_object('tabel', tablename, 'policy', policyname,
         'roles', roles::text, 'check', with_check) order by tablename, policyname), '[]'::jsonb)
  from pg_policies
  where schemaname = 'public' and cmd = 'INSERT'
    and tablename in ('pengajuan_layanan','pengajuan_surat','pendaftaran_akun')),

'policy_select_update_pengajuan', (
  select coalesce(jsonb_agg(jsonb_build_object('tabel', tablename, 'policy', policyname,
         'cmd', cmd, 'using', qual) order by tablename, policyname), '[]'::jsonb)
  from pg_policies
  where schemaname = 'public'
    and tablename in ('pengajuan_layanan','pengajuan_surat','surat_terbit','posisi_perangkat','log_pencarian_warga')
    and cmd in ('SELECT','UPDATE')),

'handle_new_user_membaca_app_metadata', (
  select pg_get_functiondef(p.oid) like '%raw_app_meta_data ->> ''role''%'
  from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = 'handle_new_user' limit 1),

'tabel_bukti_ada_dan_rls_aktif', (
  select relrowsecurity from pg_class
  where relnamespace = 'public'::regnamespace and relname = 'bukti_verifikasi_terpakai')

)) as hasil;
