-- 0029: Kunci jalur publik & role akun. JALANKAN HANYA SETELAH kode baru
-- (lib/lookupWarga.js, actions publik, kelola-akun, pendaftaran) sudah
-- DEPLOY dan 0028 sudah dijalankan. Kalau urutannya dibalik, pencarian NIK,
-- pengajuan publik, pendaftaran, dan pembuatan akun akan gagal.
-- Idempotent. Jalankan SETELAH 0028.
--
-- Isi:
--   A. Insert langsung dari publik ditutup (kode kini memakai service_role)
--   B. handle_new_user: role HANYA dari app_metadata (tidak bisa diisi pendaftar)
--   C. RPC pencarian NIK hanya boleh dijalankan service_role (server), supaya
--      rate limit di server tidak bisa dilewati lewat API Supabase langsung
--
-- ROLLBACK (kalau ada yang rusak) ada di bagian paling bawah.

begin;

-- A. ---------------------------------------------------------------------------
drop policy if exists "Publik bisa ajukan layanan (terbatas)" on public.pengajuan_layanan;
drop policy if exists "Warga bisa ajukan layanan baru"        on public.pengajuan_layanan;
drop policy if exists "Publik bisa ajukan surat (terbatas)"   on public.pengajuan_surat;
drop policy if exists "Warga bisa ajukan surat baru"          on public.pengajuan_surat;
drop policy if exists "Publik bisa daftar posisi (terbatas)"  on public.pendaftaran_akun;
drop policy if exists "Publik bisa daftar posisi"             on public.pendaftaran_akun;
-- "Staf bisa membuat pengajuan layanan" (0028) tetap ada: "Buat Surat Langsung" aman.

-- B. ---------------------------------------------------------------------------
-- Sebelumnya role dibaca dari raw_user_meta_data, yang bisa diisi siapa pun
-- saat sign-up. Sekarang dibaca dari raw_app_meta_data (hanya bisa ditulis
-- lewat Admin API / service_role). Akun TANPA role resmi tidak dibuatkan
-- profil staf, jadi tidak punya hak apa pun.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := new.raw_app_meta_data ->> 'role';
begin
  if v_role is null then
    return new;
  end if;

  insert into public.profiles (id, nama, role, jabatan, dusun)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nama', new.email),
    v_role,
    new.raw_app_meta_data ->> 'jabatan',
    new.raw_app_meta_data ->> 'dusun'
  );
  return new;
end;
$$;

-- C. ---------------------------------------------------------------------------
revoke execute on function public.cari_warga_publik(text, date, text)        from public, anon, authenticated;
revoke execute on function public.riwayat_pengajuan_publik(text, date, text) from public, anon, authenticated;
revoke execute on function public.hitung_percobaan_gagal(text, integer)      from public, anon, authenticated;

grant execute on function public.cari_warga_publik(text, date, text)        to service_role;
grant execute on function public.riwayat_pengajuan_publik(text, date, text) to service_role;
grant execute on function public.hitung_percobaan_gagal(text, integer)      to service_role;

commit;

-- ----------------------------------------------------------------------------
-- CATATAN: setelah 0029, akun yang dibuat lewat Supabase Dashboard ->
-- Authentication -> Add user TIDAK otomatis punya profil (karena tidak ada
-- app_metadata.role). Buat akun lewat menu Kelola Akun Staf di aplikasi, atau
-- tambahkan profil manual:
--   insert into public.profiles (id, nama, role, jabatan)
--   values ('<uuid-user>', 'Nama', 'admin', 'Administrator');
--
-- ROLLBACK (hanya bila perlu):
--   grant execute on function public.cari_warga_publik(text, date, text)        to anon, authenticated;
--   grant execute on function public.riwayat_pengajuan_publik(text, date, text) to anon, authenticated;
--   grant execute on function public.hitung_percobaan_gagal(text, integer)      to anon, authenticated;
--   create policy "Warga bisa ajukan layanan baru" on public.pengajuan_layanan
--     for insert to anon, authenticated with check (true);
--   create policy "Warga bisa ajukan surat baru" on public.pengajuan_surat
--     for insert to anon, authenticated with check (true);
--   create policy "Publik bisa daftar posisi" on public.pendaftaran_akun
--     for insert to anon, authenticated with check (true);
--   (handle_new_user versi lama: lihat migrasi 0002.)
