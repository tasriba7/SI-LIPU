-- Fase 1: Autentikasi ADMIN/PETUGAS DESA saja.
-- Warga TIDAK perlu login — layanan publik (pengajuan surat, pengaduan, dll.
-- di fase berikutnya) diakses lewat form terbuka + kode tracking, tanpa akun.
-- Jalankan file ini di Supabase Dashboard -> SQL Editor -> New query -> Run.

-- 1. Tabel profil staf desa, 1-1 dengan auth.users (Supabase Auth).
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nama text not null,
  role text not null default 'admin' check (role in ('admin', 'petugas')),
  created_at timestamptz not null default now()
);

-- 2. Row Level Security: wajib aktif.
alter table public.profiles enable row level security;

-- Staf hanya boleh melihat & mengubah profilnya sendiri.
create policy "Staf bisa lihat profil sendiri"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Staf bisa update profil sendiri"
  on public.profiles for update
  using (auth.uid() = id);

-- 3. Trigger: begitu ada akun staf baru dibuat (lewat Supabase Dashboard ->
--    Authentication -> Add user, BUKAN lewat form publik -- tidak ada
--    pendaftaran publik di aplikasi ini), otomatis buatkan baris profil.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nama, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nama', new.email),
    coalesce(new.raw_user_meta_data ->> 'role', 'admin')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4. Cara membuat akun admin/petugas baru:
--    Supabase Dashboard -> Authentication -> Users -> Add user
--    -> isi email & password -> centang "Auto Confirm User".
--    Baris profil akan otomatis dibuat oleh trigger di atas dengan role 'admin'.
--    Untuk jadikan 'petugas' (akses lebih terbatas, dipakai di fase berikutnya):
--    update public.profiles set role = 'petugas' where id = '<uuid-user-tsb>';
